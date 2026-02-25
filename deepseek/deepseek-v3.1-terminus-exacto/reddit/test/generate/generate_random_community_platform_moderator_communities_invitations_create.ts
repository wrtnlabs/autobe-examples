import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_invitation } from "../prepare/prepare_random_community_platform_community_invitation";

export async function generate_random_community_platform_moderator_communities_invitations_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunityInvitation.ICreate>
      | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunityInvitation> {
  const prepared: ICommunityPlatformCommunityInvitation.ICreate =
    prepare_random_community_platform_community_invitation(props.body);
  const result: ICommunityPlatformCommunityInvitation =
    await api.functional.communityPlatform.moderator.communities.invitations.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
