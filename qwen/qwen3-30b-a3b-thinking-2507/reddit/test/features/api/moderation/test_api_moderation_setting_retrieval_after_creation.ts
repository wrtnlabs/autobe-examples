import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationSetting";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_moderation_settings_create } from "../../../generate/generate_random_community_platform_user_moderation_settings_create";
import { prepare_random_community_platform_moderation_setting } from "../../../prepare/prepare_random_community_platform_moderation_setting";

export async function test_api_moderation_setting_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins as member
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create moderation setting configuration
  const moderationSetting =
    await generate_random_community_platform_user_moderation_settings_create(
      userConnection,
      {
        body: {
          feature: "bans",
          status: "active",
          configuration: { banDuration: "1 week" },
          reasons: ["Inappropriate content", "Spamming"],
        },
      },
    );
  // 3. Retrieve the moderation setting we created
  const retrievedSetting =
    await api.functional.communityPlatform.user.moderation_settings.at(
      userConnection,
      {
        settingId: moderationSetting.id,
      },
    );
  // 4. Verify the retrieved data matches the created data
  typia.assert(retrievedSetting);
  TestValidator.equals(
    "moderation setting feature matches",
    retrievedSetting.feature,
    moderationSetting.feature,
  );
  TestValidator.equals(
    "moderation setting status matches",
    retrievedSetting.status,
    moderationSetting.status,
  );
  TestValidator.equals(
    "moderation setting configuration matches",
    retrievedSetting.configuration,
    moderationSetting.configuration,
  );
  TestValidator.equals(
    "moderation setting reasons matches",
    retrievedSetting.reasons,
    moderationSetting.reasons,
  );
}
