import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Verify that retrieving a subscription through a non-existent community name returns a 404 error.
 *
 * Validates that the community existence check is enforced before any subscription lookup. The endpoint
 * must first resolve the community by its unique case-insensitive name, and if the community does not
 * exist, return a 404 error immediately without attempting to look up the subscription.
 *
 * 1. Authenticate a new member via join to obtain an authorized session.
 * 2. Generate a random community name that does not correspond to any existing community.
 * 3. Generate a valid UUID for the subscription ID parameter.
 * 4. Call the subscription retrieval endpoint with the non-existent community name.
 * 5. Verify the endpoint returns a 404 HTTP error.
 */
export async function test_api_subscription_nonexistent_community_not_found(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as a member
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {});
    // 2. Generate non-existent community name and valid subscription UUID
    const nonExistentCommunityName = RandomGenerator.alphabets(10);
    const subscriptionId = "00000000-0000-0000-0000-000000000000";
    // 3. Attempt to retrieve subscription with non-existent community — expect 404
    await TestValidator.httpError("non-existent community returns 404", 404, async () => {
        await api.functional.communityHub.member.communities.subscriptions.at(memberConnection, {
            communityName: nonExistentCommunityName,
            subscriptionId,
        });
    });
}
