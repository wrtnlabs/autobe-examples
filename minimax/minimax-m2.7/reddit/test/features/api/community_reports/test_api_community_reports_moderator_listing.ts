import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_community_reports_moderator_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member1 (who will become community owner/moderator)
  const member1Auth = await authorize_member_join(connection, {});
  const member1Connection: api.IConnection = { host: connection.host };
  member1Connection.headers = {
    Authorization: `Bearer ${member1Auth.token.access}`,
  };
  // 2. Authenticate member2 (who will create content and report it)
  const member2Auth = await authorize_member_join(connection, {});
  const member2Connection: api.IConnection = { host: connection.host };
  member2Connection.headers = {
    Authorization: `Bearer ${member2Auth.token.access}`,
  };
  // 3. Member1 creates a new community (becomes owner automatically)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 4. Member2 creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member2 creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      member2Connection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Member2 reports the post
  const postReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_id: post.id,
          target_type: "post",
          reason: `Report reason for post: ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(postReport);
  // 7. Member2 reports the comment
  const commentReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_id: comment.id,
          target_type: "comment",
          reason: `Report reason for comment: ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(commentReport);
  // 8. Member1 (as moderator) retrieves all reports with empty body
  const reportsResponse =
    await api.functional.redditClone.member.communities.reports.index(
      member1Connection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(reportsResponse);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    reportsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reportsResponse.data),
  );
  TestValidator.predicate(
    "has at least 2 reports",
    reportsResponse.data.length >= 2,
  );
  // Validate both reports are in the response
  const postReportInResponse = reportsResponse.data.find(
    (r) => r.targetType === "post" && r.targetId === post.id,
  );
  const commentReportInResponse = reportsResponse.data.find(
    (r) => r.targetType === "comment" && r.targetId === comment.id,
  );
  TestValidator.predicate(
    "post report exists",
    postReportInResponse !== undefined,
  );
  TestValidator.predicate(
    "comment report exists",
    commentReportInResponse !== undefined,
  );
  // Validate report statuses are pending
  if (postReportInResponse) {
    TestValidator.equals(
      "post report status",
      postReportInResponse.status,
      "pending",
    );
  }
  if (commentReportInResponse) {
    TestValidator.equals(
      "comment report status",
      commentReportInResponse.status,
      "pending",
    );
  }
  // Validate community reference
  if (postReportInResponse) {
    TestValidator.equals(
      "post report community id",
      postReportInResponse.community.id,
      community.id,
    );
  }
  if (commentReportInResponse) {
    TestValidator.equals(
      "comment report community id",
      commentReportInResponse.community.id,
      community.id,
    );
  }
  // Validate reporter info exists
  if (postReportInResponse) {
    TestValidator.predicate(
      "post report has reporter",
      postReportInResponse.reporter !== undefined,
    );
  }
  if (commentReportInResponse) {
    TestValidator.predicate(
      "comment report has reporter",
      commentReportInResponse.reporter !== undefined,
    );
  }
  // Validate createdAt timestamp exists
  if (postReportInResponse) {
    TestValidator.predicate(
      "post report has createdAt",
      postReportInResponse.createdAt !== undefined,
    );
  }
  if (commentReportInResponse) {
    TestValidator.predicate(
      "comment report has createdAt",
      commentReportInResponse.createdAt !== undefined,
    );
  }
}
