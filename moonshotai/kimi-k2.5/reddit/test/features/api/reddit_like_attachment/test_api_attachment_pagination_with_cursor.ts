import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_attachment_pagination_with_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(3),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Test pagination with limit
  const limit = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // First page request
  const firstPageRequest: IRedditLikeAttachment.IRequest = {
    uploadedByMemberId: null,
    originalFilename: null,
    mimeType: null,
    referenceType: null,
    cursor: null,
    limit,
    page: 1,
  };
  const firstPage = await api.functional.redditLike.attachments.index(
    memberConnection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages >= 0",
    firstPage.pagination.pages >= 0,
  );
  // If there are more pages, test second page navigation
  if (firstPage.pagination.pages > 1) {
    // Test explicit page-based pagination (page 2)
    const secondPageRequest: IRedditLikeAttachment.IRequest = {
      uploadedByMemberId: null,
      originalFilename: null,
      mimeType: null,
      referenceType: null,
      cursor: null,
      limit,
      page: 2,
    };
    const secondPage = await api.functional.redditLike.attachments.index(
      memberConnection,
      {
        body: secondPageRequest,
      },
    );
    typia.assert(secondPage);
    // Validate pagination metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "records count consistent",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    // Validate no duplicate IDs across pages
    const firstPageIds = new Set(firstPage.data.map((a) => a.id));
    const duplicates = secondPage.data.filter((a) => firstPageIds.has(a.id));
    TestValidator.equals(
      "no duplicate attachments across pages",
      duplicates.length,
      0,
    );
  }
}
