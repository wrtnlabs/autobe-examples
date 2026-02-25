import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_flair_assignment } from "../prepare/prepare_random_community_platform_community_flair_assignment";

/**
 * Generate a random community platform moderator community flair assignment.
 *
 * This function creates a flair assignment for a user within a specific community
 * using the provided connection and optional input parameters.
 *
 * Community context is established through the path parameter, ensuring flair
 * assignments are scoped to the correct community.
 *
 * @param connection - API connection for making requests
 * @param props - Configuration properties for generation
 * @param props.body - Optional partial data for the flair assignment creation
 * @param props.params - URL parameters including communityId
 * @returns The created flair assignment with complete metadata
 */
export async function generate_random_community_platform_moderator_communities_flair_assignments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityFlairAssignment.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunityFlairAssignment> {
  const prepared: ICommunityPlatformCommunityFlairAssignment.ICreate =
    prepare_random_community_platform_community_flair_assignment(props.body);
  const result: ICommunityPlatformCommunityFlairAssignment =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
