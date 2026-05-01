import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_community_moderator } from "../prepare/prepare_random_community_hub_community_moderator";

/**
 * Generate a random community moderator for E2E testing.
 *
 * Prepares random moderator creation data with a randomized username using the
 * prepare function, then calls the community moderator creation endpoint to add
 * the specified member as a moderator to the target community.
 *
 * The community is identified by its unique name passed via the params. The
 * authenticated user performing the addition is recorded as the appointing
 * member. If the target member is already a moderator of the community, the
 * operation is idempotent and returns the existing record.
 *
 * @param connection API connection with authentication credentials
 * @param props.body Optional override for the moderator creation data including username
 * @param props.params Required URL path parameters including the community name
 * @returns The created or existing moderator role record including the member profile and appointment metadata
 */
export async function generate_random_community_hub_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubCommunityModerator.ICreate> | undefined;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityHubCommunityModerator> {
  const prepared: ICommunityHubCommunityModerator.ICreate =
    prepare_random_community_hub_community_moderator(props.body);
  const result: ICommunityHubCommunityModerator =
    await api.functional.communityHub.member.communities.moderators.create(
      connection,
      {
        body: prepared,
        communityName: props.params.communityName,
      },
    );
  return result;
}
