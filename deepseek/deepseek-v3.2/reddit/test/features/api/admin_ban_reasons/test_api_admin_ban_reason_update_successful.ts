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

export async function test_api_admin_ban_reason_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Create admin account via join (use utility function)
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create initial ban reason (use generation utility)
  const initialBanReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          severity: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          active: true,
        },
      },
    );
  typia.assert(initialBanReason);
  // 3. Prepare update data with all fields modified
  const updateData = {
    code: `updated_${RandomGenerator.alphabets(6)}`,
    title: `Updated ${RandomGenerator.paragraph({ sentences: 1 })}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity: RandomGenerator.pick(
      (["low", "medium", "high", "critical"] as const).filter(
        (s) => s !== initialBanReason.severity,
      ),
    ),
    active: false,
  } satisfies ICommunityPlatformBanReason.IUpdate;
  // 4. Update the ban reason
  const updatedBanReason =
    await api.functional.communityPlatform.admin.ban_reasons.update(
      adminConnection,
      {
        reasonId: initialBanReason.id,
        body: updateData,
      },
    );
  typia.assert(updatedBanReason);
  // 5. Validate response contains updated values
  TestValidator.equals(
    "id should remain unchanged",
    updatedBanReason.id,
    initialBanReason.id,
  );
  TestValidator.equals(
    "code should be updated",
    updatedBanReason.code,
    updateData.code,
  );
  TestValidator.equals(
    "title should be updated",
    updatedBanReason.title,
    updateData.title,
  );
  TestValidator.equals(
    "description should be updated",
    updatedBanReason.description,
    updateData.description,
  );
  TestValidator.equals(
    "severity should be updated",
    updatedBanReason.severity,
    updateData.severity,
  );
  TestValidator.equals(
    "active should be updated",
    updatedBanReason.active,
    updateData.active,
  );
  // Validate timestamps
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBanReason.created_at,
    initialBanReason.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be recent",
    updatedBanReason.updated_at,
    initialBanReason.updated_at,
  );
  TestValidator.predicate("updated_at should be ISO date-time string", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      updatedBanReason.updated_at,
    ),
  );
  // Check soft deletion field remains null
  TestValidator.equals(
    "deleted_at should be null",
    updatedBanReason.deleted_at,
    null,
  );
  // 6. Verify the ban reason can be used in subsequent operations
  // (In real scenario, this would involve using the ban reason for actual banning,
  // but for this test we just validate it exists and has correct data)
  TestValidator.predicate("ban reason should have valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedBanReason.id,
    ),
  );
  // Additional validation for all fields being present
  TestValidator.predicate(
    "ban reason should have all required fields",
    () =>
      updatedBanReason.code !== undefined &&
      updatedBanReason.title !== undefined &&
      updatedBanReason.description !== undefined &&
      updatedBanReason.severity !== undefined &&
      updatedBanReason.active !== undefined &&
      updatedBanReason.created_at !== undefined &&
      updatedBanReason.updated_at !== undefined &&
      updatedBanReason.deleted_at !== undefined,
  );
}
