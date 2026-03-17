import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_approve_post_content_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member #1 (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerMember);
  // Step 2: Create a community (owner automatically becomes moderator/owner)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register member #2 (poster)
  const posterConnection: api.IConnection = { host: connection.host };
  const posterMember = await authorize_member_join(posterConnection, {});
  typia.assert(posterMember);
  // Step 4: Subscribe member #2 to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      posterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Member #2 creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    posterConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Member #2 submits a report against the post
  const report =
    await generate_random_community_member_communities_reports_create(
      posterConnection,
      {
        body: {
          post_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(report);
  // Validate that report starts as pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // Test Execution: Owner approves the report
  const approved =
    await api.functional.community.member.communities.reports.approve(
      ownerConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(approved);
  // Validations
  TestValidator.equals(
    "report status is approved",
    approved.status,
    "approved",
  );
  TestValidator.predicate("resolver is non-null", approved.resolver !== null);
  TestValidator.equals(
    "resolver is the owner",
    approved.resolver!.id,
    ownerMember.id,
  );
  TestValidator.predicate("post field is non-null", approved.post !== null);
  TestValidator.equals("comment field is null", approved.comment, null);
  TestValidator.predicate(
    "updated_at >= created_at",
    approved.updated_at >= approved.created_at,
  );
  TestValidator.predicate("reason is non-empty", approved.reason.length > 0);
  TestValidator.equals(
    "reporter matches poster",
    approved.reporter.id,
    posterMember.id,
  );
}
