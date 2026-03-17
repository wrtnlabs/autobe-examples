import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_report_target_retrieval_within_moderated_community(
  connection: api.IConnection,
): Promise<void> {
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.Format<"password">;
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  const memberJoin = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoin);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberJoinConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        },
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community owner matches joined member",
    community.member.id,
    memberJoin.id,
  );
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_member_login(moderatorConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(moderatorLogin);
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionReportId = typia.random<string & tags.Format<"uuid">>();
  let output: ICommunityPlatformModerationActionReport;
  try {
    output =
      await api.functional.communityPlatform.admin.communities.moderationActions.reports.at(
        moderatorConnection,
        {
          communityId: community.id,
          moderationActionId,
          moderationActionReportId,
        },
      );
  } catch (exp) {
    const message = exp instanceof Error ? exp.message : String(exp);
    throw new Error(
      `Unable to verify report-target retrieval happy path because no seeded moderation-action report target record was available for the newly created community: ${message}`,
    );
  }
  typia.assert(output);
  TestValidator.equals(
    "moderation action community matches requested community",
    output.moderationAction.community.id,
    community.id,
  );
  TestValidator.equals(
    "report community matches requested community",
    output.report.community.id,
    community.id,
  );
  TestValidator.predicate(
    "report reason is visible for moderator review",
    output.report.reason.length > 0,
  );
  TestValidator.predicate(
    "exactly one reported target is populated",
    (output.report.reportedPost !== null &&
      output.report.reportedComment === null) ||
      (output.report.reportedPost === null &&
        output.report.reportedComment !== null),
  );
  if (output.report.reportedPost !== null) {
    TestValidator.equals(
      "reported post community remains community-scoped",
      output.report.reportedPost.community.id,
      community.id,
    );
  }
}
