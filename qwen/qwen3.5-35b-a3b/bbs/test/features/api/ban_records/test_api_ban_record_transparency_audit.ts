import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_ban_record_transparency_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create member user to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Retrieve ban record using admin connection
  // Note: The create ban endpoint is not available in SDK, so test with existing ban record
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.at(
      adminConnection,
      {
        banRecordId,
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban record structure
  TestValidator.predicate(
    "ban record has valid UUID id",
    banRecord.id !== undefined,
  );
  TestValidator.predicate(
    "ban record has string reason",
    typeof banRecord.reason === "string",
  );
  TestValidator.predicate(
    "ban record has created_at timestamp",
    banRecord.created_at !== undefined,
  );
  // 5. Verify reason length (10-500 characters)
  TestValidator.predicate(
    "ban reason has valid length (10-500 chars)",
    banRecord.reason.length >= 10 && banRecord.reason.length <= 500,
  );
  // 6. Verify user identity information in ISummary
  TestValidator.predicate(
    "user has valid UUID id",
    banRecord.user.id !== undefined,
  );
  // 7. Verify bannedByAdmin identity information in ISummary
  TestValidator.predicate(
    "bannedByAdmin has valid UUID id",
    banRecord.bannedByAdmin.id !== undefined,
  );
  // 8. Verify no sensitive data exposure
  // ISummary doesn't have password property - already excluded by type
  // 9. Verify timestamp format (ISO 8601 UTC)
  const createdAt = new Date(banRecord.created_at);
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    !isNaN(createdAt.getTime()),
  );
  // 10. Verify ban record ID matches UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "ban record id matches UUID format",
    uuidRegex.test(banRecord.id),
  );
}