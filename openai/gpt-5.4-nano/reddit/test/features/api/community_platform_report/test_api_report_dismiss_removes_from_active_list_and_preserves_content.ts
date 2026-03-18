import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_reports_targets_create_report_target } from "../../../generate/generate_random_community_platform_member_reports_targets_create_report_target";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_target } from "../../../prepare/prepare_random_community_platform_report_target";

export async function test_api_report_dismiss_removes_from_active_list_and_preserves_content(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<string & tags.Format<"password">>();
  const email = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // 2) Create community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(12)}-${member.id}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `${RandomGenerator.alphabets(8)}://${RandomGenerator.alphabets(8)}.example/icon.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3) Assign moderator authority to the same member
  await generate_random_community_platform_community_moderators_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: member.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // 4) Create a post (need postId)
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const bodyText = RandomGenerator.paragraph({ sentences: 3 });
  const postCreateConn: api.IConnection = { host: memberConnection.host };
  await api.functional.communityPlatform.member.posts.create(postCreateConn, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: postTitle,
      body_text: bodyText,
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // Retrieve the post created: list endpoint isn't provided, so rely on direct post creation with known id not possible.
  // Therefore, create another post via the SDK that returns ICommunityPlatformPost by using posts.at after capturing from reports creation would still need id.
  // As no create-with-id exists in provided API, we instead create post via posts.create and then create report requires a target_id; without postId the scenario can't be executed.
  // Fail fast with a predicate that forces correctness in real environment where postId can be derived.
  throw new Error(
    "Cannot obtain postId: provided member.posts.create returns void in this SDK, and no post listing endpoint is available. Cannot complete report creation target mapping reliably.",
  );
}
