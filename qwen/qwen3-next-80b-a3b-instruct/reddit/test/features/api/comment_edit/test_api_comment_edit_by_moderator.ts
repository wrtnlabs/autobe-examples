import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentEdits } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentEdits";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community_moderator } from "../../../prepare/prepare_random_community_bbs_community_moderator";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_edits } from "../../../prepare/prepare_random_community_bbs_comment_edits";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comment_edits_create } from "../../../generate/generate_random_community_bbs_member_comment_edits_create";
import { generate_random_community_bbs_admin_communities_moderators_create } from "../../../generate/generate_random_community_bbs_admin_communities_moderators_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_edit_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize first member (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member1);
  // Step 2: Create a new connection and authorize admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Step 3: Create a community with admin's authority
  const community =
    await generate_random_community_bbs_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(community);
  // Step 4: Create a post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(post);
  // Step 5: Create a comment on the post
  const comment = await generate_random_community_bbs_member_comments_create(
    member1Connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content(),
      },
    },
  );
  typia.assert(comment);
  // Step 6: Create a second member account and authorize it
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member2);
  // Step 7: Assign second member as moderator of the community
  const moderatorAssignment =
    await generate_random_community_bbs_admin_communities_moderators_create(
      adminConnection,
      {
        body: {
          monitor_id: member2.id,
        },
        params: {
          communityCode: community.name,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // Step 8: Use member2 connection (as moderator) to edit the comment from member1
  const editReason = "Improved clarity of response";
  const newContent = RandomGenerator.content();
  const editRecord =
    await api.functional.communityBbs.member.comment_edits.create(
      member2Connection,
      {
        body: {
          comment_id: comment.id,
          new_content: newContent,
          edit_reason: editReason,
        } satisfies ICommunityBbsCommentEdits.ICreate,
      },
    );
  typia.assert(editRecord);
  // Step 9: Validate the edit record
  TestValidator.equals(
    "edit record comment_id matches",
    editRecord.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "edit record editor_id matches moderator",
    editRecord.editor_id,
    member2.id,
  );
  TestValidator.equals(
    "edit record new_content matches",
    editRecord.new_content,
    newContent,
  );
  TestValidator.equals(
    "edit record edit_reason matches",
    editRecord.edit_reason,
    editReason,
  );
  // Step 10: Validate that previous content is preserved in the edit record
  // This is critical - we must confirm the previous content is stored correctly
  TestValidator.equals(
    "previous_content preserved",
    editRecord.previous_content,
    comment.content,
  );
  // Fix: Correct TestValidator.predicate call with a function, convert timestamp to Date
  TestValidator.predicate(
    "edit timestamp is valid",
    () => {
      const date = new Date(editRecord.edit_timestamp); 
      return !isNaN(date.getTime()) && date.toISOString() === editRecord.edit_timestamp;
    }
  );
}