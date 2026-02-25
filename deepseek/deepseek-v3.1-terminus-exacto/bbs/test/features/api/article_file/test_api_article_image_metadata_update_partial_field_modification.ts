import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_metadata_update_partial_field_modification(
  connection: api.IConnection,
): Promise<void> {} // 1. Admin setup const adminConnection: api.IConnection = { host: connection.host }; await authorize_admin_join(adminConnection, { body: { email: typia.random<string & tags.Format<"email">>(), password: RandomGenerator.alphaNumeric(16), display_name: RandomGenerator.name(), href: typia.random<string & tags.Format<"uri">>(), referrer: typia.random<string & tags.Format<"uri">>(), ip: typia.random<string & tags.Format<"ipv4">>(), } satisfies IDiscussionBoardAdmin.IJoin, }); // 2. Create article const article = await api.functional.discussionBoard.admin.articles.create(adminConnection, { body: { title: RandomGenerator.paragraph({ sentences: 2 }), content: RandomGenerator.content({ paragraphs: 3 }), discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(), } satisfies IDiscussionBoardArticle.ICreate, }); typia.assert(article); // 3. Create image with initial metadata using utility function const initialImage = await generate_random_discussion_board_admin_articles_images_create(adminConnection, { params: { articleId: article.id, }, body: { display_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(), alt_text: "Initial alt text", caption: "Initial caption text", } satisfies DeepPartial<IDiscussionBoardArticleFile.ICreate>, }); typia.assert(initialImage); // 4. Update only alt text const updatedImage = await api.functional.discussionBoard.admin.articles.images.update(adminConnection, { articleId: article.id, imageId: initialImage.id, body: { display_order: initialImage.display_order, alt_text: "Updated alt text", caption: initialImage.caption ?? null, } satisfies IDiscussionBoardArticleFile.IUpdate, }); typia.assert(updatedImage); // 5. Validate partial field update TestValidator.equals("display order should remain unchanged", updatedImage.display_order, initialImage.display_order); TestValidator.equals("alt text should be updated", updatedImage.alt_text, "Updated alt text"); TestValidator.equals("caption should remain unchanged", updatedImage.caption, initialImage.caption); TestValidator.equals("attachment file should remain the same", updatedImage.attachment_file.id, initialImage.attachment_file.id); TestValidator.equals("status should remain unchanged", updatedImage.status, initialImage.status);}
