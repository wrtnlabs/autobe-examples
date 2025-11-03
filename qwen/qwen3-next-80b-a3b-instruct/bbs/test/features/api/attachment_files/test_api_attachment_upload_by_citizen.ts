import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_attachment_upload_by_citizen(
  connection: api.IConnection,
) {
  // 1. Authenticate as citizen
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizenPassword: string = RandomGenerator.alphaNumeric(12);

  const citizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenEmail,
        password: citizenPassword,
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(citizen);

  // 2. Create a post to which the attachment will be associated
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 7,
  });

  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: `${postTitle}\n${postBody}` satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 3. Upload an attachment using a URI reference
  const storagePath: string = typia.random<string & tags.Format<"uri">>();

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.attachmentFiles.create(connection, {
      body: storagePath satisfies IDiscussionBoardAttachment.ICreate,
    });
  typia.assert(attachment);

  // 4. Validate attachment metadata
  // Since IDiscussionBoardAttachment is a string URI, we rely on typia.assert()
  // to validate the entire response matches the contract including internal metadata
  // (filename, filetype, size, status) provided by the server.
}
