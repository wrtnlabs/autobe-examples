import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_snapshot_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphabets(6)}@test.com`,
      password: "AdminPass123!",
      displayName: `Admin${RandomGenerator.name(1)}`,
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Create plausible filter criteria by random generation
  // Use known good UUID format for postId, authorUserId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const authorUserId = typia.random<string & tags.Format<"uuid">>();
  // Generate date range filters
  // createdAtFrom is before createdAtTo
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 7 * 24 * 3600 * 1000,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 1 * 24 * 3600 * 1000,
  ).toISOString();
  // Test with valid filters and pagination
  {
    const body: ICommunityPlatformPostSnapshot.IRequest = {
      postId,
      authorUserId,
      createdAtFrom,
      createdAtTo,
      page: 1,
      limit: 5,
    };
    const output =
      await api.functional.communityPlatform.admin.postSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(output);
    // Validate pagination
    TestValidator.predicate(
      "pagination limit",
      output.pagination.limit <= 5 && output.data.length <= 5,
    );
    TestValidator.equals(
      "pagination current page",
      output.pagination.current,
      1,
    );
    // Validate filter correctness for all returned snapshot records
    output.data.forEach((snapshot) => {
      // id and communityPlatformPostId must be uuid
      typia.assert<string & tags.Format<"uuid">>(snapshot.id);
      typia.assert<string & tags.Format<"uuid">>(
        snapshot.communityPlatformPostId,
      );
      // filter postId
      TestValidator.equals(
        "post snapshot matches postId",
        snapshot.communityPlatformPostId,
        postId,
      );
      // filter authorUserId
      TestValidator.equals(
        "post snapshot matches authorUserId",
        snapshot.authorUserId,
        authorUserId,
      );
      // filter createdAt range
      TestValidator.predicate(
        "post snapshot createdAt >= createdAtFrom",
        new Date(snapshot.createdAt).getTime() >=
          new Date(createdAtFrom).getTime(),
      );
      TestValidator.predicate(
        "post snapshot createdAt <= createdAtTo",
        new Date(snapshot.createdAt).getTime() <=
          new Date(createdAtTo).getTime(),
      );
    });
  }
  // Test pagination page 2, limit 3
  {
    const body: ICommunityPlatformPostSnapshot.IRequest = {
      postId,
      authorUserId,
      createdAtFrom,
      createdAtTo,
      page: 2,
      limit: 3,
    };
    const output =
      await api.functional.communityPlatform.admin.postSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.equals(
      "pagination current page 2",
      output.pagination.current,
      2,
    );
    TestValidator.predicate(
      "pagination limit 3",
      output.pagination.limit <= 3 && output.data.length <= 3,
    );
    output.data.forEach((snapshot) => {
      TestValidator.equals(
        "post snapshot matches postId paged",
        snapshot.communityPlatformPostId,
        postId,
      );
      TestValidator.equals(
        "post snapshot matches authorUserId paged",
        snapshot.authorUserId,
        authorUserId,
      );
      TestValidator.predicate(
        "post snapshot createdAt >= createdAtFrom paged",
        new Date(snapshot.createdAt).getTime() >=
          new Date(createdAtFrom).getTime(),
      );
      TestValidator.predicate(
        "post snapshot createdAt <= createdAtTo paged",
        new Date(snapshot.createdAt).getTime() <=
          new Date(createdAtTo).getTime(),
      );
    });
  }
  // Test empty result when no records match filters
  {
    const body: ICommunityPlatformPostSnapshot.IRequest = {
      postId: typia.random<string & tags.Format<"uuid">>(),
      authorUserId: typia.random<string & tags.Format<"uuid">>(),
      createdAtFrom: new Date(
        now.getTime() + 10 * 24 * 3600 * 1000,
      ).toISOString(),
      createdAtTo: new Date(
        now.getTime() + 11 * 24 * 3600 * 1000,
      ).toISOString(),
      page: 1,
      limit: 1,
    };
    const output =
      await api.functional.communityPlatform.admin.postSnapshots.index(
        adminConnection,
        { body },
      );
    typia.assert(output);
    TestValidator.equals("empty result data length", output.data.length, 0);
  }
}
