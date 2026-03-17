import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
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

export async function test_api_moderation_action_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoin);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(12)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoin);
  const requestedPage = 1;
  const requestedLimit = 10;
  const actionType = "post_delete";
  const targetType = "post";
  const noteKeyword = RandomGenerator.alphabets(6);
  const sort = "-created_at";
  const createdFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const page =
    await api.functional.communityPlatform.admin.communities.moderationActions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          action_type: actionType,
          target_type: targetType,
          note: noteKeyword,
          created_from: createdFrom,
          created_to: createdTo,
          page: requestedPage,
          limit: requestedLimit,
          sort,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current equals requested page",
    page.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    page.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.data.length <= requestedLimit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  const expectedPages =
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit);
  TestValidator.equals(
    "pagination pages matches records and limit",
    page.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "empty records produce empty data page",
    page.pagination.records !== 0 || page.data.length === 0,
  );
  for (const item of page.data) {
    TestValidator.equals(
      "item community matches requested community",
      item.community.id,
      community.id,
    );
    TestValidator.equals(
      "item moderator community matches requested community",
      item.communityModerator.community.id,
      community.id,
    );
    TestValidator.equals(
      "item action type matches requested filter",
      item.action_type,
      actionType,
    );
    TestValidator.equals(
      "item target type matches requested filter",
      item.targetType,
      targetType,
    );
    TestValidator.predicate(
      "item created_at is on or after created_from",
      item.created_at >= createdFrom,
    );
    TestValidator.predicate(
      "item created_at is on or before created_to",
      item.created_at <= createdTo,
    );
    const note = item.note;
    TestValidator.predicate(
      "item note is present for matched note filter",
      note !== null,
    );
    if (note !== null) {
      TestValidator.predicate(
        "item note contains requested keyword",
        note.includes(noteKeyword),
      );
    }
  }
  for (let i = 1; i < page.data.length; ++i) {
    const previous = page.data[i - 1];
    const current = page.data[i];
    const ordered =
      previous.created_at > current.created_at ||
      (previous.created_at === current.created_at && previous.id >= current.id);
    TestValidator.predicate(
      `stable newest-first created_at and id ordering at index ${i}`,
      ordered,
    );
  }
}
