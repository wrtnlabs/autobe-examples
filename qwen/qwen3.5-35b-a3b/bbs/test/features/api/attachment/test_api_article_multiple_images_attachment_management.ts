import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_article_multiple_images_attachment_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicPoliticalBoardMember.IJoin,
    });
  typia.assert(member);
  // 2. Create admin account for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicPoliticalBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    });
  typia.assert(admin);
  // 3. Admin creates a section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Member creates an article in that section
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          sectionId: section.id,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Member adds multiple image attachments (JPEG and PNG)
  const image1Url = typia.random<string & tags.Format<"uri">>();
  const image2Url = typia.random<string & tags.Format<"uri">>();
  const afterAddResponse =
    await api.functional.economicPoliticalBoard.member.articles.attachments.updateAttachments(
      memberConnection,
      {
        articleId: article.id,
        body: {
          operations: [
            {
              action: "add" as const,
              file_url: image1Url,
              file_name: "test-image-1.jpg",
              file_type: "image" as const,
            },
            {
              action: "add" as const,
              file_url: image2Url,
              file_name: "test-image-2.png",
              file_type: "image" as const,
            },
          ],
        } satisfies IEconomicPoliticalBoardAttachment.IManage,
      },
    );
  typia.assert(afterAddResponse);
  // 6. Verify both images appear with correct fileType
  TestValidator.equals(
    "attachment count after add",
    afterAddResponse.data.length,
    2,
  );
  const firstAttachment = afterAddResponse.data[0];
  const secondAttachment = afterAddResponse.data[1];
  TestValidator.equals(
    "first attachment fileType",
    firstAttachment.fileType,
    "image",
  );
  TestValidator.equals(
    "second attachment fileType",
    secondAttachment.fileType,
    "image",
  );
  TestValidator.equals(
    "first attachment fileName",
    firstAttachment.fileName,
    "test-image-1.jpg",
  );
  TestValidator.equals(
    "second attachment fileName",
    secondAttachment.fileName,
    "test-image-2.png",
  );
  // 7. Store first attachment ID for removal
  const firstAttachmentId = firstAttachment.id;
  // 8. Remove one attachment using a 'remove' operation
  const afterRemoveResponse =
    await api.functional.economicPoliticalBoard.member.articles.attachments.updateAttachments(
      memberConnection,
      {
        articleId: article.id,
        body: {
          operations: [
            {
              action: "remove" as const,
              attachment_id: firstAttachmentId,
            },
          ],
        } satisfies IEconomicPoliticalBoardAttachment.IManage,
      },
    );
  typia.assert(afterRemoveResponse);
  // 9. Verify remaining attachment is still accessible
  TestValidator.equals(
    "remaining attachment count",
    afterRemoveResponse.data.length,
    1,
  );
  TestValidator.equals(
    "remaining attachment id",
    afterRemoveResponse.data[0].id,
    secondAttachment.id,
  );
  // 10. Verify the soft-deleted attachment is not in the returned data
  TestValidator.predicate(
    "removed attachment not in response",
    () => !afterRemoveResponse.data.some((a) => a.id === firstAttachmentId),
  );
}
