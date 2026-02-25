import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_retrieval_with_no_description(connection: api.IConnection) {
    // 1. Create member account and authenticate
    const memberConnection: api.IConnection = { host: connection.host };
    const authResult = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<'email'>>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(),
        }
    });
    // 2. Create community with no description
    const createdCommunity = await generate_random_reddit_member_communities_create(memberConnection, {
        body: {
            name: 'community_test_no_desc',
        }
    });
    typia.assert(createdCommunity);
    // 3. Retrieve community and verify description
    const retrievedCommunity = await api.functional.reddit.communities.at(memberConnection, {
        communityId: createdCommunity.id,
    });
    typia.assert(retrievedCommunity);
    // 4. Validate description is null
    TestValidator.equals('description is null', retrievedCommunity.description, null);
}