import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostEdit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPostEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostEdit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_edits_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  memberConnection.headers = {
    Authorization: `Bearer ${joinResponse.token.access}`,
  };
  // Generate a random postId using UUID format (as required by endpoint)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Generate a random cursor string in the format "created_at|id"
  // Since we don't have real edit records, we'll use a fake timestamp and uuid
  const cursor = `${new Date().toISOString()}|${typia.random<string & tags.Format<"uuid">>()}`;
  // Call the endpoint with the random postId and cursor
  const editsResponse = await api.functional.community.posts.edits.index(
    memberConnection,
    {
      postId,
      limit: 10,
      cursor,
    },
  );
  // Validate response structure according to IPageICommunityPostEdit
  typia.assert(editsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    editsResponse.pagination !== null,
  );
  TestValidator.equals(
    "pagination current is a number",
    typeof editsResponse.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is a number",
    typeof editsResponse.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is a number",
    typeof editsResponse.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is a number",
    typeof editsResponse.pagination.pages === "number",
    true,
  );
  // Validate data array exists and is an array
  TestValidator.predicate(
    "data array exists",
    Array.isArray(editsResponse.data),
  );
  // Validate each item in data is an object (ICommunityPostEdit is empty object, so we can only verify it's an object)
  editsResponse.data.forEach((edit) => {
    TestValidator.predicate(
      "edit is an object",
      typeof edit === "object" && edit !== null,
    );
  });
}
