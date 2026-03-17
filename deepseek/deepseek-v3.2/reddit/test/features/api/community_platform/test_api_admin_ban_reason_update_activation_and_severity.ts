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

/**
 * Test ban reason activation status change and severity validation.
 * 1. Create admin account
 * 2. Create active ban reason
 * 3. Update to change active status to false (deactivate)
 * 4. Verify ban reason is no longer active but still retrievable
 * 5. Update severity to each allowed value (low, medium, high, critical)
 */
export async function test_api_admin_ban_reason_update_activation_and_severity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create active ban reason using utility function
  const reason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          severity: "low",
          active: true,
        } satisfies ICommunityPlatformBanReason.ICreate,
      },
    );
  typia.assert(reason);
  TestValidator.equals("ban reason initially active", reason.active, true);
  // 3. Deactivate the ban reason
  const deactivatedReason =
    await api.functional.communityPlatform.admin.ban_reasons.update(
      adminConnection,
      {
        reasonId: reason.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformBanReason.IUpdate,
      },
    );
  typia.assert(deactivatedReason);
  TestValidator.equals(
    "ban reason deactivated",
    deactivatedReason.active,
    false,
  );
  TestValidator.equals("id unchanged", deactivatedReason.id, reason.id);
  TestValidator.equals("code unchanged", deactivatedReason.code, reason.code);
  TestValidator.equals(
    "title unchanged",
    deactivatedReason.title,
    reason.title,
  );
  TestValidator.equals(
    "description unchanged",
    deactivatedReason.description,
    reason.description,
  );
  TestValidator.equals(
    "severity unchanged",
    deactivatedReason.severity,
    reason.severity,
  );
  TestValidator.predicate(
    "updated_at changed",
    deactivatedReason.updated_at !== reason.updated_at,
  );
  // 4. Test all allowed severity values
  const severities: Array<"low" | "medium" | "high" | "critical"> = [
    "low",
    "medium",
    "high",
    "critical",
  ] as const;
  for (const severity of severities) {
    const updatedReason =
      await api.functional.communityPlatform.admin.ban_reasons.update(
        adminConnection,
        {
          reasonId: reason.id,
          body: {
            severity,
          } satisfies ICommunityPlatformBanReason.IUpdate,
        },
      );
    typia.assert(updatedReason);
    TestValidator.equals(
      `severity updated to ${severity}`,
      updatedReason.severity,
      severity,
    );
  }
  // Note: Type error testing is prohibited - server validation errors are not tested in E2E
  // as they would cause compilation errors. Business logic errors should be tested instead.
}
