import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_reports_create } from "../../../generate/generate_random_reddit_clone_member_posts_reports_create";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_content_post } from "../../../prepare/prepare_random_reddit_clone_content_post";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_moderator_report_approve_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login owner to create community A
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: typia.random<IRedditCloneOwner.IJoin>(),
    },
  );
  typia.assert(owner);
  // 2. Create community A
  const communityA = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(communityA);
  // 3. Register and login moderator A for community A
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await api.functional.redditClone.auth.moderator.join(
    moderatorAConnection,
    {
      body: typia.random<IRedditCloneModerator.IJoin>(),
    },
  );
  typia.assert(moderatorA);
  // 4. Assign moderator A to community A
  const assignmentA =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: communityA.id,
        body: {
          appointedActorId: moderatorA.id,
          appointingActorId: owner.id,
          communityId: communityA.id,
          role: "moderator",
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignmentA);
  // 5. Register and login moderator B (different moderator for community B)
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await api.functional.redditClone.auth.moderator.join(
    moderatorBConnection,
    {
      body: typia.random<IRedditCloneModerator.IJoin>(),
    },
  );
  typia.assert(moderatorB);
  // 6. Register community B and assign moderator B to it
  const communityB = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(communityB);
  const assignmentB =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: communityB.id,
        body: {
          appointedActorId: moderatorB.id,
          appointingActorId: owner.id,
          communityId: communityB.id,
          role: "moderator",
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignmentB);
  // 7. Register and login member to create content in community A
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: typia.random<IRedditCloneMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 8. Member creates a post in community A
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        type: "text",
        title: RandomGenerator.name(3),
        community_id: communityA.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCloneContentPost.ICreate,
    },
  );
  typia.assert(post);
  // 9. Create a report for the post
  const report = await api.functional.redditClone.member.posts.reports.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        report_type: "post",
        reason: "Spam content",
      } satisfies IRedditCloneContentReport.ICreate,
    },
  );
  typia.assert(report);
  // 10. Moderator B (assigned to community B, not A) attempts to approve the report for community A's content
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "moderator B should not be able to approve report for community A",
    async () => {
      await api.functional.redditClone.moderator.communities.reports.approve(
        moderatorBConnection,
        {
          communityId: communityA.id,
          reportId: report.id,
          body: {
            reason: "Approving as moderator B",
          } satisfies IRedditCloneContentReportResolution.IRequest,
        },
      );
    },
  );
  // 11. Verify report status is still 'pending' and content is not deleted
  // Since there's no list endpoint, verify by trying to create another report for the same post
  // This should succeed if the post still exists
  const postExistsReport =
    await api.functional.redditClone.member.posts.reports.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          report_type: "post",
          reason: "Post still exists verification",
        } satisfies IRedditCloneContentReport.ICreate,
      },
    );
  typia.assert(postExistsReport);
  // 12. Moderator A (assigned to community A) approves the same report
  const approval =
    await api.functional.redditClone.moderator.communities.reports.approve(
      moderatorAConnection,
      {
        communityId: communityA.id,
        reportId: report.id,
        body: {
          reason: "Approved by authorized moderator A",
        } satisfies IRedditCloneContentReportResolution.IRequest,
      },
    );
  typia.assert(approval);
  // 13. Verify post is deleted by trying to create another report for the same post
  await TestValidator.error(
    "post should be deleted after report approval",
    async () => {
      await api.functional.redditClone.member.posts.reports.create(
        memberConnection,
        {
          postId: post.id,
          body: {
            report_type: "post",
            reason: "Post should be deleted",
          } satisfies IRedditCloneContentReport.ICreate,
        },
      );
    },
  );
}
