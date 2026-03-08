import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_content_response_structure(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // Prepare search request
  const searchRequest: IRedditLikeMember.IRequest = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    type: RandomGenerator.pick(["post", "comment", "community"]),
    limit: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  };
  // Execute search
  const output = await api.functional.redditLike.admin.search.content.search(
    adminConnection,
    {
      body: searchRequest,
    },
  );
  // Validate response structure
  typia.assert(output);
  // Verify pagination structure
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit valid",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  // Verify data array structure
  if (output.data.length > 0) {
    // Check first item structure
    const firstItem = output.data[0];
    TestValidator.equals("item has id", typeof firstItem.id, "string");
    TestValidator.equals(
      "item has entity_type",
      typeof firstItem.entity_type,
      "string",
    );
    TestValidator.equals("item has title", typeof firstItem.title, "string");
    TestValidator.equals(
      "item has content",
      typeof firstItem.content,
      "string",
    );
    TestValidator.equals("item has score", typeof firstItem.score, "number");
    TestValidator.equals(
      "item has hit_count",
      typeof firstItem.hit_count,
      "number",
    );
    TestValidator.equals(
      "item has created_at",
      typeof firstItem.created_at,
      "string",
    );
    // Validate entity_type values
    TestValidator.predicate(
      "entity_type is valid",
      ["post", "comment", "community"].includes(firstItem.entity_type),
    );
    // Validate content length
    TestValidator.predicate(
      "content truncated to 200 chars",
      firstItem.content.length <= 200,
    );
  }
}