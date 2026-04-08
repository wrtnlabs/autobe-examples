import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscription_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create 5 communities
  const communities: IRedditCloneCommunity[] = await ArrayUtil.asyncRepeat(
    5,
    async (index: number) => {
      const community =
        await api.functional.redditClone.member.communities.create(
          memberConnection,
          {
            body: {
              name: `${RandomGenerator.alphabets(8)}_${Date.now()}_${index}`,
              description: RandomGenerator.paragraph({ sentences: 2 }),
            },
          },
        );
      typia.assert(community);
      return community;
    },
  );
  // 3. Subscribe to all 5 communities
  const subscriptions: IRedditCloneSubscription[] = await ArrayUtil.asyncRepeat(
    5,
    async (index: number) => {
      const subscription =
        await api.functional.redditClone.member.subscriptions.create(
          memberConnection,
          {
            body: {
              communityId: communities[index].id,
            },
          },
        );
      typia.assert(subscription);
      return subscription;
    },
  );
  // 4. Call GET /redditClone/member/subscriptions with limit=2
  const firstPage: IPageIRedditCloneSubscription.ISummary =
    await api.functional.redditClone.member.subscriptions.list(
      memberConnection,
    );
  typia.assert(firstPage);
  // 5. Validate first page response
  TestValidator.equals("first page data length", firstPage.data.length, 2);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.equals("first page records", firstPage.pagination.records, 5);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 3);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  // 6. Get second page using cursor from last item
  const lastItem = firstPage.data[firstPage.data.length - 1];
  const secondPage: IPageIRedditCloneSubscription.ISummary =
    await api.functional.redditClone.member.subscriptions.list(
      memberConnection,
    );
  typia.assert(secondPage);
  // 7. Validate second page response
  TestValidator.equals("second page data length", secondPage.data.length, 2);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  // Validate results are different from first page
  const firstPageIds = firstPage.data.map((s) => s.id);
  const secondPageIds = secondPage.data.map((s) => s.id);
  TestValidator.predicate(
    "second page results are different from first page",
    firstPageIds.some((id) => secondPageIds.includes(id)) === false,
  );
}
