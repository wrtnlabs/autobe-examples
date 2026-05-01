import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_community } from "../prepare/prepare_random_community_hub_community";

/**
 * Generate a random community hub community via the API for E2E testing.
 *
 * Prepares random community data using the prepare function, then calls the
 * community creation endpoint. The authenticated member becomes the permanent
 * owner of the newly created community, which is immediately discoverable by
 * all users through community listing and search endpoints.
 *
 * The generated community includes a random 2-3 word human-readable name, a
 * brief 2-sentence description, and a randomly generated valid icon image URI.
 * Community names are unique across the platform with case-insensitive
 * matching — attempting to create a duplicate name results in a 409 conflict.
 * The subscriber count is initialized to zero and the owner is not
 * automatically subscribed upon creation.
 *
 * All fields can be overridden through the optional body parameter, enabling
 * targeted testing of specific scenarios such as duplicate name detection,
 * edge case descriptions, or custom icon URIs.
 *
 * @param connection API connection with authenticated member credentials
 * @param props.body Optional partial community creation data to override
 *   randomly generated values
 * @returns The newly created community with all fields including generated
 *   UUID id, owner member summary, created_at/updated_at timestamps, and
 *   initial subscriber_count of zero
 */
export async function generate_random_community_hub_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubCommunity.ICreate>;
  },
): Promise<ICommunityHubCommunity> {
  const prepared: ICommunityHubCommunity.ICreate =
    prepare_random_community_hub_community(props.body);
  const result: ICommunityHubCommunity =
    await api.functional.communityHub.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
