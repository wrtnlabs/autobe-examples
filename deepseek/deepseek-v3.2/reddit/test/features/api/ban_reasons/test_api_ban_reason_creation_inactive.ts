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

export async function test_api_ban_reason_creation_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Prepare ban reason creation data with active: false
  const severityValues = ["low", "medium", "high", "critical"] as const;
  const createBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    severity: RandomGenerator.pick(severityValues),
    active: false,
  } satisfies ICommunityPlatformBanReason.ICreate;
  // 3. Create ban reason using utility function
  const banReason =
    await generate_random_community_platform_admin_ban_reasons_create(
      adminConnection,
      { body: createBody },
    );
  typia.assert(banReason);
  // 4. Validate response
  TestValidator.equals(
    "ban reason active should be false",
    banReason.active,
    false,
  );
  TestValidator.equals("code matches", banReason.code, createBody.code);
  TestValidator.equals("title matches", banReason.title, createBody.title);
  TestValidator.equals(
    "description matches",
    banReason.description,
    createBody.description,
  );
  TestValidator.equals(
    "severity matches",
    banReason.severity,
    createBody.severity,
  );
  TestValidator.equals("deleted_at should be null", banReason.deleted_at, null);
  // 5. Validate timestamps are recent (within 60 seconds of now)
  const now = Date.now();
  const createdAt = new Date(banReason.created_at).getTime();
  const updatedAt = new Date(banReason.updated_at).getTime();
  const tolerance = 60000; // 60 seconds
  TestValidator.predicate(
    "created_at should be recent",
    () => Math.abs(now - createdAt) <= tolerance,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    () => Math.abs(now - updatedAt) <= tolerance,
  );
}
