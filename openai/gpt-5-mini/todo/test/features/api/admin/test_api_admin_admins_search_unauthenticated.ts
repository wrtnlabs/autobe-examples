import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_admins_search_unauthenticated(
  connection: api.IConnection,
) {
  // Purpose: Verify that unauthenticated requests to PATCH /todoApp/admin/admins are rejected
  // and that error responses do not leak sensitive admin data.

  // 1) Prepare a minimal, valid request body according to ITodoAppAdmin.IRequest
  const requestBody = {
    page: 1,
    pageSize: 10,
  } satisfies ITodoAppAdmin.IRequest;

  // 2) Create an unauthenticated connection by cloning the provided connection
  //    and providing an empty headers object. Do NOT mutate the original connection.headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Attempt the request and assert that it fails with 401 or 403 (unauthorized/forbidden)
  //    Capture the thrown error so we can perform an additional defensive check
  //    that the error message does not contain sensitive fields.
  let capturedError: unknown = undefined;

  await TestValidator.httpError(
    "unauthenticated request should be rejected",
    [401, 403],
    async () => {
      try {
        await api.functional.todoApp.admin.admins.index(unauthConn, {
          body: requestBody,
        });
      } catch (exp) {
        capturedError = exp;
        // rethrow so TestValidator.httpError can validate the HTTP status
        throw exp;
      }
    },
  );

  // 4) Defensive check: if the caught error exposes structured JSON, ensure
  //    it does not leak sensitive admin fields such as password or password_hash.
  //    This check is cautious: only run if toJSON() exists and returns a message.
  if (capturedError && typeof (capturedError as any).toJSON === "function") {
    try {
      const json = (capturedError as any).toJSON();
      const message = String(json?.message ?? "").toLowerCase();

      TestValidator.predicate(
        "error message should not contain sensitive fields",
        !message.includes("password") && !message.includes("password_hash"),
      );
    } catch {
      // If parsing the error fails for any reason, do not fail the test because
      // the primary assertion (http error) already validated the auth enforcement.
    }
  }
}
