import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_account_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1) Prepare two isolated connection clones so SDK's join will set tokens on
  //    their respective connection objects without manual header manipulation.
  const deleterConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create the deleter admin account (will set deleterConn.headers via SDK)
  const deleterEmail = `deleter+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const deleterBody = {
    email: deleterEmail,
    password: "P@ssword123",
    display_name: RandomGenerator.name(),
    href: "http://localhost/test",
    referrer: "http://localhost/ref",
  } satisfies ITodoAppAdmin.ICreate;

  const deleter: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(deleterConn, {
      body: deleterBody,
    });
  typia.assert(deleter);
  TestValidator.predicate("deleter is active", deleter.is_active === true);

  // 3) Create the target admin account (targetConn will receive its token)
  const targetEmail = `target+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const targetBody = {
    email: targetEmail,
    password: "P@ssword123",
    display_name: RandomGenerator.name(),
    href: "http://localhost/test",
    referrer: "http://localhost/ref",
  } satisfies ITodoAppAdmin.ICreate;

  const target: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(targetConn, {
      body: targetBody,
    });
  typia.assert(target);
  TestValidator.predicate(
    "target is active before deletion",
    target.is_active === true,
  );

  // 4) Perform soft-delete using the deleter's connection (deleterConn carries
  //    the deleter's access token because join set it on deleterConn).
  await api.functional.todoApp.admin.admins.erase(deleterConn, {
    adminId: target.id,
  });

  // 5) Attempt to delete again - expect an HTTP error (404 Not Found or 410 Gone
  //    depending on implementation). Use TestValidator.httpError to validate.
  await TestValidator.httpError(
    "deleting an already-deleted admin should fail",
    [404, 410],
    async () => {
      await api.functional.todoApp.admin.admins.erase(deleterConn, {
        adminId: target.id,
      });
    },
  );

  // 6) Final sanity checks: ensure ids are present and are UUIDs
  // typia.assert on previously-asserted objects already validated structure
  TestValidator.predicate(
    "deleter id is present",
    typeof deleter.id === "string" && deleter.id.length > 0,
  );
  TestValidator.predicate(
    "target id is present",
    typeof target.id === "string" && target.id.length > 0,
  );
}
