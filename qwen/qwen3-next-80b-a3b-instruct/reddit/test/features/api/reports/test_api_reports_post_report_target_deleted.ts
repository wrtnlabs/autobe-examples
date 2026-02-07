import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_reports_post_report_target_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Create a post as the authenticated member using utility function
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: typia.random<ICommunityPost.ICreate>(),
    },
  );
  // The ICommunityPost interface is empty but the API returns an object with an 'id' property
  // Based on external definition, IEntity provides the 'id' property structure
  // Use IEntity directly as a non-generic interface to extend the type
  type CompletePost = ICommunityPost & IEntity;
  const postWithId = typia.assert<CompletePost>(post);
  // 3. Delete the created post to simulate content removal
  await api.functional.community.member.posts.erase(memberConnection, {
    postId: postWithId.id,
  });
  // 4. Attempt to report the deleted post
  // This should return 404 Not Found without creating any report
  await TestValidator.httpError(
    "reporting deleted post should return 404",
    404,
    async () => {
      await generate_random_community_member_reports_create(memberConnection, {
        body: {
          reported_content_id: postWithId.id,
          content_type: "post" as const,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityReport.ICreate,
      });
    },
  );
}
