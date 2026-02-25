import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_update_attachments_tags_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "http://localhost/admin-login",
    referrer: "http://localhost/admin-login-referrer",
  };
  await authorize_administrator_login(adminConnection, {
    body: adminLoginBody,
  });
  // 2. Admin creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `Section_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 3. Registered user joins and logs in
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user_password_2023",
  };
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUserAuthorized = await authorize_registered_user_join(
    userConnection,
    {
      body: userJoinBody,
    },
  );
  typia.assert(registeredUserAuthorized);
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
  };
  await authorize_registered_user_login(userConnection, {
    body: userLoginBody,
  });
  // 4. Registered user creates an article with attachments and tags
  const initialTags: string[] = [
    `tag${RandomGenerator.alphabets(3)}`,
    `tag${RandomGenerator.alphabets(3)}`,
  ];
  const initialAttachments = [
    {
      fileName: `file_${RandomGenerator.alphabets(4)}.txt`,
      fileType: "text/plain",
      fileSize: 1234,
      downloadUrl: `http://files.test.com/file${RandomGenerator.alphaNumeric(6)}`,
      displayOrder: 0,
    },
    {
      fileName: `image_${RandomGenerator.alphabets(4)}.jpg`,
      fileType: "image/jpeg",
      fileSize: 4321,
      downloadUrl: `http://images.test.com/image${RandomGenerator.alphaNumeric(6)}`,
      displayOrder: 1,
    },
  ] satisfies IDiscussionBoardArticleAttachmentReference[];
  const createBody = {
    title: `Initial Title ${RandomGenerator.name()}`,
    content: RandomGenerator.content({ paragraphs: 2 }),
    sectionId: section.id,
    tags: initialTags,
    attachments: initialAttachments,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: createBody,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "initial tags count",
    article.tags.length,
    initialTags.length,
  );
  TestValidator.equals(
    "initial files count",
    article.files.length + article.images.length,
    initialAttachments.length,
  );
  // 5. Registered user updates the article: changing title, content, section, attachments, tags
  const newSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `Section_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(newSection);
  // Prepare updated tags (remove one, add one)
  const removedTag = initialTags[0];
  const addedTag = `tag${RandomGenerator.alphabets(3)}`;
  const updatedTags = [initialTags[1], addedTag];
  // Attachments updates: remove first attachment, add new attachment
  const removedAttachmentId =
    article.files.length > 0
      ? article.files[0].id
      : article.images.length > 0
        ? article.images[0].id
        : undefined;
  const newAttachment = {
    fileName: `newfile_${RandomGenerator.alphabets(4)}.pdf`,
    fileType: "application/pdf",
    fileSize: 2345,
    downloadUrl: `http://files.test.com/newfile${RandomGenerator.alphaNumeric(5)}`,
    displayOrder: 2,
  } satisfies IDiscussionBoardArticleAttachmentReference;
  // Prepare attachments list, removing removed attachment and adding new one
  const newAttachments = article.files.slice(1).map((f) => ({
    fileName: f.fileName,
    fileType: f.fileType,
    fileSize: f.fileSize,
    downloadUrl: f.downloadUrl,
    displayOrder: f.displayOrder,
  }));
  const newImages = article.images.map((i) => ({
    fileName:
      i.imageUrl.split("/").pop() ?? `img${RandomGenerator.alphabets(3)}`,
    fileType: "image/jpeg",
    fileSize: 1234,
    downloadUrl: i.imageUrl,
    displayOrder: i.displayOrder,
  }));
  // Combine files and images attachments
  const combinedAttachments: IDiscussionBoardArticleAttachmentReference[] = [];
  for (const f of newAttachments) combinedAttachments.push(f);
  for (const i of newImages) combinedAttachments.push(i);
  combinedAttachments.push(newAttachment);
  const updateBody = {
    title: `Updated Title ${RandomGenerator.name()}`,
    content: RandomGenerator.content({ paragraphs: 3 }),
    sectionId: newSection.id,
    tags: updatedTags,
    attachments: combinedAttachments,
  } satisfies IDiscussionBoardArticle.IUpdate & {
    tags?: string[];
    attachments?: IDiscussionBoardArticleAttachmentReference[];
  };
  const updated =
    await api.functional.discussionBoard.registeredUser.articles.update(
      userConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated title", updated.title, updateBody.title);
  TestValidator.equals("updated content", updated.content, updateBody.content);
  TestValidator.equals(
    "updated section id",
    typia.assert<IDiscussionBoardSection>(updated.section).id,
    newSection.id,
  );
  // Validate updated tags count only, since ISummary does not expose names
  TestValidator.equals(
    "updated tags count",
    updated.tags.length,
    updatedTags.length,
  );
  // Validate attachments changes
  const updatedFileNames = updated.files.map((f) => f.fileName);
  const updatedImageUrls = updated.images.map((i) => i.imageUrl);
  TestValidator.predicate(
    "updated attachments contains new file",
    updatedFileNames.includes(newAttachment.fileName),
  );
  if (removedAttachmentId !== undefined) {
    const removedFileExists = updated.files.some(
      (f) => f.id === removedAttachmentId,
    );
    const removedImageExists = updated.images.some(
      (i) => i.id === removedAttachmentId,
    );
    TestValidator.predicate(
      "removed attachment no longer exists",
      !removedFileExists && !removedImageExists,
    );
  }
  // Because attachments are merged from files and images with some conversions, verify counts
  TestValidator.equals(
    "attachments count matches",
    updated.files.length + updated.images.length,
    combinedAttachments.length,
  );
}
