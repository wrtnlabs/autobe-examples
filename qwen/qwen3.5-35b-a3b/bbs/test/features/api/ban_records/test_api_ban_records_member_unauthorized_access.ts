import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_records_member_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a regular member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  const memberResult = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberResult);
  // 2. Login member with separate connection
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginResult = await authorize_member_login(
    memberLoginConnection,
    {
      body: {
        email: memberData.email,
        password: memberData.password,
      } satisfies IEconomicPoliticalBoardMember.ILogin,
    },
  );
  typia.assert(memberLoginResult);
  // 3. Attempt to access the admin-only ban records endpoint with member credentials
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "member should receive 403 when accessing admin ban records endpoint",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.ban_records.index(
        memberLoginConnection,
        {
          body: typia.random<IEconomicPoliticalBoardBanRecord.IRequest>(),
        },
      );
    },
  );
  // 4. Verify error response does not leak sensitive information
  const memberErrorConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      memberErrorConnection,
      {
        body: {
          page: 1,
          pageSize: 100,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
    // If we reach here, the test failed (should have thrown 403)
    TestValidator.error(
      "ban records endpoint should reject with 403 for member",
      () => {
        throw new Error("Expected 403 Forbidden but got success");
      },
    );
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      // Verify the error has correct status
      TestValidator.equals(
        "ban records unauthorized access returns 403",
        error.status,
        403,
      );
      // Verify error message is appropriate and doesn't leak sensitive info
      const errorMessage =
        error.message && typeof error.message === "string"
          ? error.message
          : JSON.stringify(error.message);
      TestValidator.predicate(
        "error message indicates insufficient privileges",
        errorMessage.includes("forbidden") ||
          errorMessage.includes("permission") ||
          errorMessage.includes("unauthorized"),
      );
      // Verify no ban record data is leaked in error response
      const isBanRecordData =
        errorMessage.includes("user_id") ||
        errorMessage.includes("banned_by_admin_id") ||
        errorMessage.includes("ban_reason");
      TestValidator.notEquals(
        "error response does not leak ban record data",
        isBanRecordData,
        true,
      );
    } else {
      // Unexpected error type
      TestValidator.error(
        "ban records unauthorized access throws HttpError",
        () => {
          throw new Error(
            `Expected HttpError but got ${typeof error}: ${error}`,
          );
        },
      );
    }
  }
}
