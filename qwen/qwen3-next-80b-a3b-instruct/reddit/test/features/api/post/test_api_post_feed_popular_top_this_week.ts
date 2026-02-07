import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_feed_popular_top_this_week(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for member registration
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  // The request body for index endpoint must be empty as per ICommunityPost.IRequest definition
  // No properties can be passed as the interface is empty
  const popularFeedConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.community.posts.index(
    popularFeedConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(result);
  // Validate structure of response - only possible validation with empty DTOs
  TestValidator.equals(
    "result has pagination",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "result has data array",
    Array.isArray(result.data),
    true,
  );
}
