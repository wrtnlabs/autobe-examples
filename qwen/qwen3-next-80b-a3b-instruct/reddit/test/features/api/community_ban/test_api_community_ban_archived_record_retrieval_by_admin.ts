import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_archived_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  adminConnection.headers = { Authorization: adminJoinResult.token.access };
  // 2. Generate a valid ICommunityBannedUser object and extract its id
  // This ensures the banId follows the correct UUID format and structure,
  // even though we cannot create the ban record directly
  const mockBanRecord = typia.random<ICommunityBannedUser>();
  const banId = mockBanRecord.id;
  // 3. Retrieve the archived ban record
  const banRecord = await api.functional.community.admin.bans.at(
    adminConnection,
    {
      banId,
    },
  );
  typia.assert(banRecord);
  // 4. Validate that the record is archived (deleted_at is set)
  TestValidator.notEquals(
    "deleted_at should not be null (record is archived)",
    banRecord.deleted_at,
    null,
  );
}
