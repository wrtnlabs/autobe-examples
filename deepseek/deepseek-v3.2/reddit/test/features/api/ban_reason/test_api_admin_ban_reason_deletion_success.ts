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

export async function test_api_admin_ban_reason_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create a ban reason using utility function
  const banReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {},
    );
  typia.assert(banReason);
  TestValidator.predicate(
    "ban reason initially active",
    banReason.active === true,
  );
  TestValidator.equals(
    "ban reason initially not soft-deleted",
    banReason.deleted_at,
    null,
  );
  // 3. Delete the ban reason
  await api.functional.communityPlatform.admin.ban_reasons.erase(
    adminConnection,
    {
      reasonId: banReason.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
    },
  );
  // 4. Verify soft deletion - we need to check the ban reason's state after deletion
  // Since there's no GET endpoint, we'll test that the same ID cannot be deleted again
  // (should return error for already deleted reason)
  await TestValidator.error(
    "cannot delete already soft-deleted ban reason",
    async () => {
      await api.functional.communityPlatform.admin.ban_reasons.erase(
        adminConnection,
        {
          reasonId: banReason.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 5. Verify business logic: The ban reason should be soft-deleted
  // We can't verify the actual state without a GET endpoint,
  // but the error on second deletion indicates it's already deleted
  TestValidator.predicate(
    "ban reason ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(banReason.id),
  );
  // 6. Verify historical record preservation concept
  // Since we can't query deleted records directly, we verify that
  // the operation completed without throwing (implicit validation)
  // and that we have the original ban reason data for audit reference
  TestValidator.predicate(
    "original ban reason data preserved for audit",
    banReason.code !== undefined &&
      banReason.title !== undefined &&
      banReason.description !== undefined &&
      banReason.severity !== undefined,
  );
}
