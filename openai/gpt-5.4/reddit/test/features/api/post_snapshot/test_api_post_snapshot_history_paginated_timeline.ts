import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_snapshots_create } from "../../../generate/generate_random_community_platform_member_posts_snapshots_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_snapshot_history_paginated_timeline(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  const visibilityState = "active";
  const snapshot1 =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          visibility_state: visibilityState,
        },
      },
    );
  typia.assert(snapshot1);
  const updatedPost1 =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
        },
      },
    );
  typia.assert(updatedPost1);
  const snapshot2 =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          visibility_state: visibilityState,
        },
      },
    );
  typia.assert(snapshot2);
  const updatedPost2 =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(updatedPost2);
  const snapshot3 =
    await generate_random_community_platform_member_posts_snapshots_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          visibility_state: visibilityState,
        },
      },
    );
  typia.assert(snapshot3);
  const firstPageRequest = {
    page: 1,
    limit: 2,
    visibility_state: visibilityState,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;
  const firstPage =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  const repeatedFirstPage =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: firstPageRequest,
      },
    );
  typia.assert(repeatedFirstPage);
  const secondPageRequest = {
    page: 2,
    limit: 2,
    visibility_state: visibilityState,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;
  const secondPage =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "repeated first page responses are deterministic",
    firstPage,
    repeatedFirstPage,
  );
  TestValidator.equals(
    "first page current matches request",
    firstPage.pagination.current,
    firstPageRequest.page,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    firstPageRequest.limit,
  );
  TestValidator.equals(
    "second page current matches request",
    secondPage.pagination.current,
    secondPageRequest.page,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    secondPageRequest.limit,
  );
  TestValidator.equals(
    "pagination pages derived from records and limit",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.equals(
    "pagination records stable across repeated pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination pages stable across repeated pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "filtered timeline has at least three records",
    firstPage.pagination.records >= 3,
  );
  TestValidator.predicate(
    "first page contains at most the requested limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "second page contains at most the requested limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  const combined = [...firstPage.data, ...secondPage.data];
  const combinedIds = combined.map((item) => item.id);
  const combinedRevisionNumbers = combined.map((item) => item.revision_no);
  const explicitSnapshotIds = [snapshot1.id, snapshot2.id, snapshot3.id];
  const explicitRevisionNumbers = [
    snapshot1.revision_no,
    snapshot2.revision_no,
    snapshot3.revision_no,
  ];
  TestValidator.predicate(
    "requested pages do not duplicate snapshot ids",
    new Set(combinedIds).size === combinedIds.length,
  );
  TestValidator.predicate(
    "requested pages do not duplicate revision numbers",
    new Set(combinedRevisionNumbers).size === combinedRevisionNumbers.length,
  );
  TestValidator.predicate(
    "explicit snapshots are discoverable in paginated history",
    explicitSnapshotIds.every((id) => combinedIds.includes(id)),
  );
  TestValidator.predicate(
    "explicit revision numbers are discoverable in paginated history",
    explicitRevisionNumbers.every((revisionNo) =>
      combinedRevisionNumbers.includes(revisionNo),
    ),
  );
  TestValidator.predicate(
    "all returned snapshots have positive revision numbers",
    combined.every((item) => item.revision_no > 0),
  );
  TestValidator.predicate(
    "all returned snapshots match the requested visibility state",
    combined.every((item) => item.visibility_state === visibilityState),
  );
}
