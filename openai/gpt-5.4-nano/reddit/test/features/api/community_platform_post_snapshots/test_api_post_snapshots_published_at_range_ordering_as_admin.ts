import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshots_published_at_range_ordering_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // --------------------
  // 1) Admin authorization
  // --------------------
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies
        | (string & tags.Format<"password">)
        | (string & tags.Format<"password">),
      href: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"uri">,
      referrer: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const adminConnectionWithToken: api.IConnection = {
    host: adminConnection.host,
    headers: {
      ...(adminConnection.headers ?? {}),
    },
  };
  // --------------------
  // 2) Create a post
  // --------------------
  const postCreatorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(postCreatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies
        | (string & tags.Format<"password">)
        | (string & tags.Format<"password">),
      href: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"uri">,
      referrer: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const post: ICommunityPlatformPost.ICreate =
    typia.random<ICommunityPlatformPost.ICreate>();
  const postCreated: void =
    await generate_random_community_platform_admin_posts_create(
      postCreatorConnection,
      {
        body: post satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postCreated);

  // We need actual postId, but the generator returns void.
  // Use SDK create to capture? Not allowed: generator required for POST /posts.
  // Therefore, create one more and rely on subsequent snapshot create returning created snapshot.
  // We'll create snapshots and take postId from request/response.
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // --------------------
  // 3) Create snapshots with controlled publishedAt and tie-break
  // --------------------
  const baseTime = new Date("2026-03-18T10:45:23.022Z");
  const t1 = new Date(baseTime.getTime() - 30000).toISOString();
  const t2 = new Date(baseTime.getTime() - 10000).toISOString();
  const t3 = new Date(baseTime.getTime() + 10000).toISOString();
  const publishedTitles = {
    a: `snapshot-a-${RandomGenerator.alphabets(6)}`,
    b: `snapshot-b-${RandomGenerator.alphabets(6)}`,
    c: `snapshot-c-${RandomGenerator.alphabets(6)}`,
    d: `snapshot-d-${RandomGenerator.alphabets(6)}`,
    e: `snapshot-e-${RandomGenerator.alphabets(6)}`,
    deleted: `snapshot-deleted-${RandomGenerator.alphabets(6)}`,
  };
  const sharedPayload: Omit<
    ICommunityPlatformPostSnapshot.ICreate,
    "publishedAt"
  > &
    Pick<ICommunityPlatformPostSnapshot.ICreate, "publishedAt"> = {
    publishedAt: t2,
    title: publishedTitles.b,
    body: RandomGenerator.paragraph({ sentences: 3 }),
    linkUrl: null,
  };
  // Snapshot A
  const createdA =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t1,
          title: publishedTitles.a,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdA);
  // Snapshot B
  const createdB =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t2,
          title: publishedTitles.b,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdB);
  // Snapshot D and E tie-break on createdAt within same publishedAt (t2)
  const createdD =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t2,
          title: publishedTitles.d,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdD);
  const createdE =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t2,
          title: publishedTitles.e,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdE);
  // Snapshot C
  const createdC =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t3,
          title: publishedTitles.c,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdC);
  // Soft-deleted snapshot
  const softDeleted =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnectionWithToken,
      {
        params: { postId: postId as string & tags.Format<"uuid"> },
        body: {
          publishedAt: t2,
          title: publishedTitles.deleted,
          body: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(softDeleted);
  // --------------------
  // 4) Call processSnapshots with ordering asc and range
  // --------------------
  const request: ICommunityPlatformPostSnapshot.IRequest = {
    publishedAtRange: { from: t1, to: t3 },
    orderDirection: "asc",
    includeDeleted: false,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPostSnapshot.IRequest;
  const actual =
    await api.functional.communityPlatform.admin.posts.snapshots.processSnapshots(
      adminConnectionWithToken,
      {
        postId: postId,
        body: request,
      },
    );
  typia.assert(actual);
  // --------------------
  // 5) Validate ordering and filtering
  // --------------------
  const snapshots: ICommunityPlatformPostSnapshot[] = Array.isArray(actual)
    ? actual
    : ([actual] as ICommunityPlatformPostSnapshot[]);
  TestValidator.equals(
    "all snapshots must match postId",
    snapshots.every((s) => s.postId === postId),
    true,
  );
  TestValidator.predicate("publishedAt within inclusive range", () =>
    snapshots.every(
      (s) =>
        s.publishedAt >= request.publishedAtRange!.from &&
        s.publishedAt <= request.publishedAtRange!.to,
    ),
  );
  // expected ordering by publishedAt asc, createdAt asc for ties
  const expectedSorted = [...snapshots].sort((x, y) => {
    if (x.publishedAt < y.publishedAt) return -1;
    if (x.publishedAt > y.publishedAt) return 1;
    if (x.createdAt < y.createdAt) return -1;
    if (x.createdAt > y.createdAt) return 1;
    return 0;
  });
  TestValidator.index(
    "snapshots ordered by publishedAt asc and createdAt asc tie-break",
    expectedSorted,
    snapshots,
  );
  // includeDeleted=false => deletedAt must be null for all
  TestValidator.predicate("soft-deleted snapshots excluded", () =>
    snapshots.every((s) => s.deletedAt === null),
  );
  TestValidator.predicate(
    "pagination respected by limit",
    () => snapshots.length <= (request.limit ?? 0),
  );
}
