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

export async function test_api_attachment_filtered_search_by_uploader(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a second member to filter by
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {});
  // 3. Search attachments filtered by target member's ID
  const request = {
    uploadedByMemberId: targetMember.id,
    originalFilename: null,
    mimeType: null,
    referenceType: null,
    cursor: null,
    limit: 20,
    page: null,
  } satisfies IRedditLikeAttachment.IRequest;
  const response = await api.functional.redditLike.attachments.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata exists and has valid values
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  // If data exists, verify pagination consistency
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages equals ceil(records / limit)",
      response.pagination.pages,
      expectedPages,
    );
  }
  // 5. If attachments exist, validate they are filtered by target uploader
  for (const attachment of response.data) {
    TestValidator.equals(
      "attachment uploader matches filter",
      attachment.uploadedByMember.id,
      targetMember.id,
    );
  }
}
