import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_multiple_independent(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup - creates community and post
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  // Member B setup - joins the platform
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // Member A reports the post
  const reasonA = "Reason from member A";
  const reportA =
    await generate_random_community_platform_member_reports_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
          target_id: post.id,
          reason: reasonA,
        },
      },
    );
  typia.assert(reportA);
  // Member B reports the same post with different reason
  const reasonB = "Reason from member B";
  const reportB =
    await generate_random_community_platform_member_reports_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
          target_id: post.id,
          reason: reasonB,
        },
      },
    );
  typia.assert(reportB);
  // Validate both reports link to the same target post
  TestValidator.equals("report A targets the post", reportA.target.id, post.id);
  TestValidator.equals("report B targets the post", reportB.target.id, post.id);
  TestValidator.equals(
    "both reports target same post",
    reportA.target.id,
    reportB.target.id,
  );
  // Validate each report has correct reporter
  TestValidator.equals(
    "report A reporter is member A",
    reportA.member.id,
    memberA.id,
  );
  TestValidator.equals(
    "report B reporter is member B",
    reportB.member.id,
    memberB.id,
  );
  TestValidator.notEquals(
    "reporters are different",
    reportA.member.id,
    reportB.member.id,
  );
  // Validate each report has independent reason
  TestValidator.equals("report A reason matches", reportA.reason, reasonA);
  TestValidator.equals("report B reason matches", reportB.reason, reasonB);
  TestValidator.notEquals(
    "reasons are different",
    reportA.reason,
    reportB.reason,
  );
  // Validate both reports have pending status
  TestValidator.equals("report A status is pending", reportA.status, "pending");
  TestValidator.equals("report B status is pending", reportB.status, "pending");
  // Validate each report has unique ID
  TestValidator.notEquals("report IDs are unique", reportA.id, reportB.id);
  // Validate community association for moderator queue
  TestValidator.equals(
    "report A community matches",
    reportA.community.id,
    community.id,
  );
  TestValidator.equals(
    "report B community matches",
    reportB.community.id,
    community.id,
  );
  // Validate target type is post for both
  TestValidator.equals("report A target type", reportA.targetType, "post");
  TestValidator.equals("report B target type", reportB.targetType, "post");
  // Validate timestamps are different (reports created at different times)
  TestValidator.notEquals(
    "created_at timestamps are different",
    reportA.createdAt,
    reportB.createdAt,
  );
}
