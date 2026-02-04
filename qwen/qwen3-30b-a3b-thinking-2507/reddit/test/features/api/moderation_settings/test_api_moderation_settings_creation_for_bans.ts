import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationSetting";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { prepare_random_community_platform_moderation_setting } from "../../../prepare/prepare_random_community_platform_moderation_setting";
import { generate_random_community_platform_user_moderation_settings_create } from "../../../generate/generate_random_community_platform_user_moderation_settings_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_moderation_settings_creation_for_bans(connection: api.IConnection): Promise<void> {
    const moderatorConnection: api.IConnection = { host: connection.host };
    const moderator = await authorize_user_join(moderatorConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>() satisfies string as string,
            password: typia.random<string & tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">>() satisfies string as string,
            display_name: RandomGenerator.name(),
        },
    });
    const moderationSetting = await generate_random_community_platform_user_moderation_settings_create(moderatorConnection, {
        body: {
            feature: "bans",
            status: "active",
            configuration: {
                auto_ban_threshold: 5,
                ban_duration: "30d",
            },
            reasons: ["Spam", "Inappropriate Content", "Harassment"],
        },
    });
    typia.assert(moderationSetting);
};