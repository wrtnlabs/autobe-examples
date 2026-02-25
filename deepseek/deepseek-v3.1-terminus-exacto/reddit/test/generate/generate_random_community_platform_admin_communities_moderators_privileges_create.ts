import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignment";
import type { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderator_assignment_privilege } from "../prepare/prepare_random_community_platform_moderator_assignment_privilege";

export async function generate_random_community_platform_admin_communities_moderators_privileges_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModeratorAssignmentPrivilege.ICreate>;
    params: {
      communityId: string;
      moderatorId: string;
    };
  },
): Promise<ICommunityPlatformModeratorAssignmentPrivilege> {
  const prepared: ICommunityPlatformModeratorAssignmentPrivilege.ICreate =
    prepare_random_community_platform_moderator_assignment_privilege(
      props.body,
    );
  const result: ICommunityPlatformModeratorAssignmentPrivilege =
    await api.functional.communityPlatform.admin.communities.moderators.privileges.create(
      connection,
      {
        communityId: props.params.communityId,
        moderatorId: props.params.moderatorId,
        body: prepared,
      },
    );
  return result;
}
