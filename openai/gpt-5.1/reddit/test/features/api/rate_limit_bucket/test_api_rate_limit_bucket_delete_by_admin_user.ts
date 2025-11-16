import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformRateLimitBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRateLimitBucket";

export async function test_api_rate_limit_bucket_delete_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a new rate limit bucket under this admin context.
  const nowIso: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const createBody = {
    scope: "post_creation",
    bucket_key: `test-bucket-${RandomGenerator.alphaNumeric(8)}`,
    max_actions: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_seconds: 60 as number & tags.Type<"int32"> & tags.Minimum<1>,
    current_count: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    window_start_at: nowIso,
    blocked_until: null,
    metadata: JSON.stringify({ reason: "e2e-delete-test" }),
  } satisfies ICommunityPlatformRateLimitBucket.ICreate;

  const createdBucket: ICommunityPlatformRateLimitBucket =
    await api.functional.communityPlatform.adminUser.rateLimitBuckets.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformRateLimitBucket>(createdBucket);

  // Basic field equality validations between input and created bucket.
  TestValidator.equals(
    "created bucket scope matches input",
    createdBucket.scope,
    createBody.scope,
  );
  TestValidator.equals(
    "created bucket bucket_key matches input",
    createdBucket.bucket_key,
    createBody.bucket_key,
  );
  TestValidator.equals(
    "created bucket max_actions matches input",
    createdBucket.max_actions,
    createBody.max_actions,
  );
  TestValidator.equals(
    "created bucket window_seconds matches input",
    createdBucket.window_seconds,
    createBody.window_seconds,
  );
  TestValidator.equals(
    "created bucket current_count matches input",
    createdBucket.current_count,
    createBody.current_count,
  );
  TestValidator.equals(
    "created bucket metadata matches input",
    createdBucket.metadata,
    createBody.metadata,
  );

  // 3. Delete the bucket using its id via the erase endpoint.
  await api.functional.communityPlatform.adminUser.rateLimitBuckets.erase(
    connection,
    {
      rateLimitBucketId: createdBucket.id,
    },
  );
}
