import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_update_name_unique(connection: api.IConnection) {
    // 1. Authenticate as member
    const authConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(authConnection, {
        body: typia.random<ICommunityPlatformMember.IJoin>(),
    });

    // 2. Create a community
    const community = await generate_random_community_platform_member_communities_create(authConnection, {
        body: typia.random<DeepPartial<ICommunityPlatformCommunity>>() as DeepPartial<ICommunityPlatformCommunity>
    });

    // 3. Update community name
    const newName = RandomGenerator.name();
    const updatedCommunity = await api.functional.communityPlatform.member.communities.update(authConnection, {
        communityId: community.id,
        body: {
            name: newName
        }
    });

    // 4. Validate update
    typia.assert(updatedCommunity);
    TestValidator.equals("name matches input", updatedCommunity.name, newName);
}