import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_record_revoked_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create ban record with revoked status using utility function
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number | null as number | null,
          ban_status: "revoked" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Validate ban record properties
  TestValidator.equals(
    "ban_status should be 'revoked'",
    banRecord.ban_status,
    "revoked",
  );
  TestValidator.equals("revoked_at should be null", banRecord.revoked_at, null);
  TestValidator.equals(
    "revoked_reason should be null",
    banRecord.revoked_reason,
    null,
  );
  TestValidator.predicate(
    "ban_reason should not be empty",
    banRecord.ban_reason.length > 0,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(new Date(banRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(new Date(banRecord.updated_at).getTime()),
  );
  // Validate expires_at based on ban_duration_days
  if (
    banRecord.ban_duration_days !== null &&
    banRecord.ban_duration_days !== undefined
  ) {
    TestValidator.predicate(
      "expires_at should be set for temporary bans",
      banRecord.expires_at !== null,
    );
  } else {
    TestValidator.equals(
      "expires_at should be null for permanent bans",
      banRecord.expires_at,
      null,
    );
  }
}
