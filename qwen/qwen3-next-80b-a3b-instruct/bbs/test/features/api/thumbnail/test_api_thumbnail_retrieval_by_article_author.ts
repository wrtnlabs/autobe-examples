import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThumbnail";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_thumbnail } from "../../../prepare/prepare_random_discussion_board_thumbnail";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_thumbnails_create } from "../../../generate/generate_random_discussion_board_citizen_thumbnails_create";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_thumbnail_retrieval_by_article_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen actor connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    citizenConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(citizen);
  // Step 2: Create article as prerequisite for thumbnail generation
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Generate thumbnail associated with the created article
  const thumbnail: IDiscussionBoardThumbnail =
    await generate_random_discussion_board_citizen_thumbnails_create(
      citizenConnection,
      {
        body: {
          article_id: article.id,
        } satisfies IDiscussionBoardThumbnail.ICreate,
      },
    );
  typia.assert(thumbnail);
  // Step 4: Extract the thumbnail ID from the URL using UUID regex pattern
  // The URL is guaranteed to be a valid URI (per IDiscussionBoardThumbnail.url definition)
  const urlMatch = thumbnail.url.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/,
  );
  if (!urlMatch) {
    throw new Error("Could not extract UUID from thumbnail URL");
  }
  const thumbnailId = urlMatch[1];
  // Validate extracted ID matches UUID format
  typia.assert<string & tags.Format<"uuid">>(thumbnailId);
  // Step 5: Retrieve thumbnail by its unique ID
  // Using base connection since thumbnail retrieval endpoint is public
  await api.functional.discussionBoard.thumbnails.at(connection, {
    thumbnailId: thumbnailId,
  });
}
