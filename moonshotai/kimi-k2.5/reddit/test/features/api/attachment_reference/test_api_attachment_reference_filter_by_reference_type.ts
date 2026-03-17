import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentReference";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_attachment_reference_filter_by_reference_type(
  connection: api.IConnection,
): Promise<void> {
  // Call the attachment references endpoint filtered by profile reference type
  const response = await api.functional.redditLike.attachment_references.index(
    connection,
    {
      body: {
        reference_type: "profile",
      } satisfies IRedditLikeAttachmentReference.IRequest,
    },
  );
  typia.assert(response);
  // Validate business logic: all returned references should be of type 'profile'
  // with non-null profileId and null communityId/postId
  for (const reference of response.data) {
    TestValidator.equals(
      "reference type matches filter",
      reference.referenceType,
      "profile",
    );
    TestValidator.notEquals("profileId is not null", reference.profileId, null);
    TestValidator.equals(
      "communityId is null for profile references",
      reference.communityId,
      null,
    );
    TestValidator.equals(
      "postId is null for profile references",
      reference.postId,
      null,
    );
  }
}
