import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { generate_random_community_platform_moderator_community_moderators_create } from "../../../generate/generate_random_community_platform_moderator_community_moderators_create";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_community_moderators_create_moderator_assignment(connection: api.IConnection): Promise<void> {
    // Scenario 1: Successfully assign a user as a moderator to an existing community.
    {
        const moderatorConnection: api.IConnection = { host: connection.host };
        const moderator = await authorize_moderator_join(moderatorConnection, { body: {} });
        typia.assert(moderator);

        const userConnection: api.IConnection = { host: connection.host };
        const user = await authorize_user_join(userConnection, { body: {} });
        typia.assert(user);

        const communityId = typia.random<string & tags.Format<"uuid">>();
        
        const assignment = await generate_random_community_platform_moderator_community_moderators_create(moderatorConnection, {
            body: {
                communityId: communityId,
                communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
                role: "moderator",
            },
        });

        typia.assert(assignment);
    }

    // Scenario 2: Prevent assigning multiple owners to the same community.
    {
        const moderatorConnection: api.IConnection = { host: connection.host };
        const moderator = await authorize_moderator_join(moderatorConnection, { body: {} });
        typia.assert(moderator);

        const adminConnection: api.IConnection = { host: connection.host };
        const admin = await authorize_admin_join(adminConnection, { body: {} });
        typia.assert(admin);

        const communityId = typia.random<string & tags.Format<"uuid">>();

        const ownerAssignment = await generate_random_community_platform_admin_community_moderators_create(adminConnection, {
            body: {
                communityId: communityId,
                communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
                role: "owner",
            },
        });
        typia.assert(ownerAssignment);

        await TestValidator.error("scenario 2: cannot assign second owner", async () => {
            await generate_random_community_platform_moderator_community_moderators_create(moderatorConnection, {
                body: {
                    communityId: communityId,
                    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
                    role: "owner",
                },
            });
        });
    }

    // Scenario 3: Authorization enforcement for creating moderator assignments.
    {
        const unauthorizedConnection: api.IConnection = { host: connection.host };
        const unauthorizedUser = await authorize_user_join(unauthorizedConnection, { body: {} });
        typia.assert(unauthorizedUser);

        await TestValidator.httpError("scenario 3: unauthorized cannot assign moderator", 403, async () => {
            await generate_random_community_platform_moderator_community_moderators_create(unauthorizedConnection, {
                body: {
                    communityId: typia.random<string & tags.Format<"uuid">>(),
                    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
                    role: "moderator",
                },
            });
        });
    }
}
