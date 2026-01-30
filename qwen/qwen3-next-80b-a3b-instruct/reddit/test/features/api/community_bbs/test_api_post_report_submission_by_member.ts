import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_post_report } from "../../../prepare/prepare_random_community_bbs_post_report";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_post_reports_create } from "../../../generate/generate_random_community_bbs_member_post_reports_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_report_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a community for hosting the post
  const communityConnection: api.IConnection = { host: connection.host };
  const authHeader = memberConnection.headers?.Authorization;
  const passwordForLogin = typeof authHeader === 'string' ? authHeader.split(' ')[1] : password;
  await authorize_member_login(communityConnection, {
    body: {
      email: member.email,
      password: passwordForLogin,
    } satisfies ICommunityBbsMember.ILogin,
  });
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post that will be reported (using member connection)
  const postConnection: api.IConnection = { host: connection.host };
  const authHeader2 = memberConnection.headers?.Authorization;
  const password2 = typeof authHeader2 === 'string' ? authHeader2.split(' ')[1] : password;
  await authorize_member_login(postConnection, {
    body: {
      email: member.email,
      password: password2,
    } satisfies ICommunityBbsMember.ILogin,
  });
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(postConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Prepare valid violation category ID
  // We have no way to obtain a real violation category ID from the system
  // Since the system doesn't provide any utility function to read violation_categories,
  // we must generate a valid UUID format since the type requires it
  // Note: This violates the requirement to use existing categories but it's impossible to implement otherwise
  const violationCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Submit post report using member connection
  // The API returns HTTP 201 with no response body
  // We cannot validate individual report properties as there's no retrieval endpoint
  // But we can validate that no error is thrown and the request completes successfully
  await generate_random_community_bbs_member_post_reports_create(
    memberConnection,
    {
      body: {
        target_post_id: post.id,
        selected_violation_category_id: violationCategoryId,
        comment: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 20,
        }),
      } satisfies ICommunityBbsPostReport.ICreate,
    },
  );
  // The test passes if the report submission succeeds without throwing an error
  // The HTTP 201 status and absence of response body are validated by the API framework
}