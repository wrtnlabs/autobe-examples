import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_action_comment_list_authorized_review(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const fixture = (
    globalThis as unknown as {
      communityPlatformModerationActionCommentReviewFixture?: {
        communityId: string & tags.Format<"uuid">;
        moderationActionId: string & tags.Format<"uuid">;
        primaryRequest?: ICommunityPlatformModerationActionComment.IRequest;
        secondaryRequest?: ICommunityPlatformModerationActionComment.IRequest;
      };
    }
  ).communityPlatformModerationActionCommentReviewFixture;
  TestValidator.predicate(
    "fixture for authorized moderation action comment review exists",
    fixture !== undefined,
  );
  const prepared = typia.assert(fixture!);
  const primaryRequest =
    prepared.primaryRequest ??
    ({
      page: 1,
      limit: 10,
      isDeleted: false,
    } satisfies ICommunityPlatformModerationActionComment.IRequest);
  const page =
    await api.functional.communityPlatform.member.communities.moderationActions.comments.index(
      memberConnection,
      {
        communityId: prepared.communityId,
        moderationActionId: prepared.moderationActionId,
        body: primaryRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "primary pagination current is positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "primary pagination limit is positive",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "primary data length does not exceed page limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "primary record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "primary page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "primary linkage ids are unique within page",
    new Set(page.data.map((item) => item.id)).size,
    page.data.length,
  );
  for (const item of page.data) {
    TestValidator.predicate("linkage has id", item.id.length > 0);
    TestValidator.predicate(
      "linkage created_at is populated",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "linkage updated_at is populated",
      item.updated_at.length > 0,
    );
    typia.assert(item.comment);
  }
  if (prepared.secondaryRequest !== undefined) {
    const secondaryPage =
      await api.functional.communityPlatform.member.communities.moderationActions.comments.index(
        memberConnection,
        {
          communityId: prepared.communityId,
          moderationActionId: prepared.moderationActionId,
          body: prepared.secondaryRequest,
        },
      );
    typia.assert(secondaryPage);
    TestValidator.predicate(
      "secondary pagination current is positive",
      secondaryPage.pagination.current >= 1,
    );
    TestValidator.predicate(
      "secondary pagination limit is positive",
      secondaryPage.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "secondary data length does not exceed page limit",
      secondaryPage.data.length <= secondaryPage.pagination.limit,
    );
    TestValidator.predicate(
      "secondary record count is non-negative",
      secondaryPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "secondary page count is non-negative",
      secondaryPage.pagination.pages >= 0,
    );
    TestValidator.equals(
      "secondary linkage ids are unique within page",
      new Set(secondaryPage.data.map((item) => item.id)).size,
      secondaryPage.data.length,
    );
  }
}
