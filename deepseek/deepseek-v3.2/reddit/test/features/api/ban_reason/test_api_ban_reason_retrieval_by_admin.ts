import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_ban_reasons_create } from "../../../generate/generate_random_community_platform_admin_ban_reasons_create";
import { prepare_random_community_platform_ban_reason } from "../../../prepare/prepare_random_community_platform_ban_reason";

export async function test_api_ban_reason_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a standardized ban reason using utility function
  const created =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {},
    );
  typia.assert(created);
  // Step 3: Retrieve the created ban reason using GET endpoint
  const retrieved = await api.functional.communityPlatform.ban_reasons.at(
    adminConnection,
    {
      reasonId: created.id,
    },
  );
  typia.assert(retrieved);
  // Step 4: Validate that all creation fields match
  TestValidator.equals("ban reason code matches", created.code, retrieved.code);
  TestValidator.equals(
    "ban reason title matches",
    created.title,
    retrieved.title,
  );
  TestValidator.equals(
    "ban reason description matches",
    created.description,
    retrieved.description,
  );
  TestValidator.equals(
    "ban reason severity matches",
    created.severity,
    retrieved.severity,
  );
  TestValidator.equals(
    "ban reason active status matches",
    created.active,
    retrieved.active,
  );
  // Step 5: Validate business logic - deleted_at should be null for active ban reason
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
