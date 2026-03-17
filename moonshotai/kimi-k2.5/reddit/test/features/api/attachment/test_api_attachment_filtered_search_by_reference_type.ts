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

export async function test_api_attachment_filtered_search_by_reference_type(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Test filtering by each reference type (profile, community, post)
  const referenceTypes = ["profile", "community", "post"] as const;
  for (const referenceType of referenceTypes) {
    const response = await api.functional.redditLike.attachments.index(
      memberConnection,
      {
        body: {
          uploadedByMemberId: null,
          originalFilename: null,
          mimeType: null,
          referenceType,
          cursor: null,
          limit: 20,
          page: 1,
        } satisfies IRedditLikeAttachment.IRequest,
      },
    );
    typia.assert(response);
  }
  // Test with null referenceType (no filter applied)
  const responseNoFilter = await api.functional.redditLike.attachments.index(
    memberConnection,
    {
      body: {
        uploadedByMemberId: null,
        originalFilename: null,
        mimeType: null,
        referenceType: null,
        cursor: null,
        limit: 20,
        page: 1,
      } satisfies IRedditLikeAttachment.IRequest,
    },
  );
  typia.assert(responseNoFilter);
}
