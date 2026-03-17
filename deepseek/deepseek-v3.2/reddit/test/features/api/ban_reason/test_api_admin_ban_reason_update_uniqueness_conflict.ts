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

export async function test_api_admin_ban_reason_update_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create first ban reason
  const firstCode = RandomGenerator.alphaNumeric(8);
  const firstTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstBanReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {
        body: {
          code: firstCode,
          title: firstTitle,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          severity: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
        } satisfies DeepPartial<ICommunityPlatformBanReason.ICreate>,
      },
    );
  typia.assert(firstBanReason);
  // 3. Create second ban reason with different code and title
  const secondCode = RandomGenerator.alphaNumeric(8);
  const secondTitle = RandomGenerator.paragraph({ sentences: 2 });
  const secondBanReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      {
        body: {
          code: secondCode,
          title: secondTitle,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          severity: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
        } satisfies DeepPartial<ICommunityPlatformBanReason.ICreate>,
      },
    );
  typia.assert(secondBanReason);
  // Verify initial uniqueness
  TestValidator.notEquals(
    "initial codes differ",
    firstBanReason.code,
    secondBanReason.code,
  );
  TestValidator.notEquals(
    "initial titles differ",
    firstBanReason.title,
    secondBanReason.title,
  );
  // 4. Test code uniqueness constraint violation
  await TestValidator.httpError(
    "update with duplicate code should return 409",
    409,
    async () => {
      await api.functional.communityPlatform.admin.ban_reasons.update(
        adminConnection,
        {
          reasonId: firstBanReason.id,
          body: {
            code: secondBanReason.code,
          } satisfies ICommunityPlatformBanReason.IUpdate,
        },
      );
    },
  );
  // Verify first ban reason unchanged after failed code update
  // Fetch the ban reason to verify no changes
  const firstAfterCodeUpdate =
    await api.functional.communityPlatform.admin.ban_reasons.update(
      adminConnection,
      {
        reasonId: firstBanReason.id,
        body: {
          // Update with original values to fetch current state
          description: firstBanReason.description,
        } satisfies ICommunityPlatformBanReason.IUpdate,
      },
    );
  typia.assert(firstAfterCodeUpdate);
  TestValidator.equals(
    "code unchanged after failed update",
    firstAfterCodeUpdate.code,
    firstBanReason.code,
  );
  TestValidator.equals(
    "title unchanged after failed code update",
    firstAfterCodeUpdate.title,
    firstBanReason.title,
  );
  TestValidator.equals(
    "description unchanged after failed code update",
    firstAfterCodeUpdate.description,
    firstBanReason.description,
  );
  // 5. Test title uniqueness constraint violation
  await TestValidator.httpError(
    "update with duplicate title should return 409",
    409,
    async () => {
      await api.functional.communityPlatform.admin.ban_reasons.update(
        adminConnection,
        {
          reasonId: firstBanReason.id,
          body: {
            title: secondBanReason.title,
          } satisfies ICommunityPlatformBanReason.IUpdate,
        },
      );
    },
  );
  // Verify first ban reason unchanged after failed title update
  const firstAfterTitleUpdate =
    await api.functional.communityPlatform.admin.ban_reasons.update(
      adminConnection,
      {
        reasonId: firstBanReason.id,
        body: {
          // Update with original values to fetch current state
          description: firstBanReason.description,
        } satisfies ICommunityPlatformBanReason.IUpdate,
      },
    );
  typia.assert(firstAfterTitleUpdate);
  TestValidator.equals(
    "title unchanged after failed update",
    firstAfterTitleUpdate.title,
    firstBanReason.title,
  );
  TestValidator.equals(
    "code unchanged after failed title update",
    firstAfterTitleUpdate.code,
    firstBanReason.code,
  );
  TestValidator.equals(
    "description unchanged after failed title update",
    firstAfterTitleUpdate.description,
    firstBanReason.description,
  );
  // Verify second ban reason remains unchanged throughout
  const secondAfterAll =
    await api.functional.communityPlatform.admin.ban_reasons.update(
      adminConnection,
      {
        reasonId: secondBanReason.id,
        body: {
          // Update with original values to fetch current state
          description: secondBanReason.description,
        } satisfies ICommunityPlatformBanReason.IUpdate,
      },
    );
  typia.assert(secondAfterAll);
  TestValidator.equals(
    "second ban reason code unchanged",
    secondAfterAll.code,
    secondBanReason.code,
  );
  TestValidator.equals(
    "second ban reason title unchanged",
    secondAfterAll.title,
    secondBanReason.title,
  );
  TestValidator.equals(
    "second ban reason description unchanged",
    secondAfterAll.description,
    secondBanReason.description,
  );
}
