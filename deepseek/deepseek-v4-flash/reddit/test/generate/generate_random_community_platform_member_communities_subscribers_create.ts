import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import typia, { tags } from "typia";

import { prepare_random_community_platform_subscription } from "../prepare/prepare_random_community_platform_subscription";

/**
 * Generate a random community platform subscription via the API for E2E testing.
 *
 * Subscribes the authenticated member to the specified community identified by
 * communityId. Uses the prepare function to create the subscription creation
 * payload (an empty marker object), then calls the subscribe endpoint. The
 * community must already exist and the member must be authenticated for the
 * operation to succeed.
 *
 * @param connection The API connection object
 * @param props.body Optional partial input to override default prepared
 *                   subscription data
 * @param props.params.communityId The UUID of the community to subscribe to
 * @returns The created subscription record with full details including
 *          timestamps
 */
export async function generate_random_community_platform_member_communities_subscribers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSubscription.ICreate>;
    params?: { communityId: string };
  }
): Promise<ICommunityPlatformSubscription> {
  const prepared: ICommunityPlatformSubscription.ICreate =
    prepare_random_community_platform_subscription(props.body);
  const result: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.communities.subscribers.create(
      connection,
      {
        body: prepared,
        communityId: typia.assert<string & tags.Format<"uuid">>(props.params!.communityId),
      },
    );
  return result;
}