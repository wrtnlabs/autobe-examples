import { Controller } from "@nestjs/common";
import { TypedRoute, TypedParam, TypedBody } from "@nestia/core";
import typia, { tags } from "typia";
import { postDiscussionBoardAdminUserArticlesArticleIdComments } from "../../../../../providers/postDiscussionBoardAdminUserArticlesArticleIdComments";
import { AdminuserAuth } from "../../../../../decorators/AdminuserAuth";
import { AdminuserPayload } from "../../../../../decorators/payload/AdminuserPayload";
import { putDiscussionBoardAdminUserArticlesArticleIdCommentsCommentId } from "../../../../../providers/putDiscussionBoardAdminUserArticlesArticleIdCommentsCommentId";

import { IDiscussionBoardComment } from "../../../../../api/structures/IDiscussionBoardComment";

@Controller("/discussionBoard/adminUser/articles/:articleId/comments")
export class DiscussionboardAdminuserArticlesCommentsController {
  /**
   * Create a new discussion_board_comments record attached to a specific
   * article.
   *
   * Create a new comment on a specific discussion board article identified by
   * its article ID.
   *
   * This operation allows an authenticated user—either a registered member or
   * an administrator—to post a new text comment attached directly to a target
   * article in the economic and political discussion board. The article is
   * identified using the `articleId` path parameter, which maps to the primary
   * key of the `discussion_board_articles` Prisma model. Before inserting the
   * comment, the system must verify that the referenced article exists and that
   * its current status permits additional comments, following any business
   * rules and Prisma schema comments associated with the article entity, such
   * as flags for comment locking or archival.
   *
   * Internally, the core comment data is stored in the
   * `discussion_board_comments` table, which contains fields such as the
   * textual content, timestamps created by the database or application layer,
   * and any structural relationships like parent comment references if nested
   * discussions are supported. The request body is represented by the
   * `IDiscussionBoardComment.ICreate` DTO, which encapsulates only the fields
   * that clients are allowed to set, such as comment content and, when
   * supported, a parent comment identifier for replies. Fields that are
   * system-managed—such as primary keys, creation timestamps, and foreign keys
   * to the article and author—are populated by the service based on the path
   * parameter and the authenticated user context rather than being supplied
   * directly by the caller.
   *
   * In addition to the base comment entity, the system uses ownership subtype
   * tables such as `discussion_board_comment_of_memberusers` and
   * `discussion_board_comment_of_adminusers` to capture which actor wrote the
   * comment and, if modeled in the schema, which login session was used at
   * creation time. The service inspects the authenticated principal to
   * determine whether the comment should be linked through the member or admin
   * subtype and creates the corresponding row accordingly, respecting any
   * unique or foreign key constraints defined in those Prisma models.
   *
   * Security-wise, this endpoint is restricted to authenticated actors, modeled
   * here through the `authorizationActors` array indicating that both member
   * and admin roles are valid. Authorization logic in the provider ensures that
   * blocked or restricted accounts, as defined by the
   * `discussion_board_memberuser_restrictions` model, cannot create new
   * comments even if they are nominally authenticated. The operation also
   * validates comment content against business rules from the requirements and
   * schema comments—such as maximum length, disallowed HTML, or prohibited
   * language—to help maintain civility and adherence to the discussion board’s
   * content guidelines.
   *
   * On success, the API returns a fully populated `IDiscussionBoardComment` DTO
   * representing the newly created comment, including core fields like
   * identifier, content, creation timestamp, and any lightweight projections of
   * related entities that the DTO defines (for example, minimal article and
   * author information). Clients typically call this operation after retrieving
   * article details via an article retrieval endpoint and then refresh the
   * article’s comment list—via a separate comment listing or article detail
   * API—to display the new comment in context. Errors include 404 when the
   * article does not exist, 403 when the user is restricted from commenting,
   * and 400-level responses when validation of the request body fails.
   *
   * @param connection
   * @param articleId Unique identifier of the target article in the
   *   discussion_board_articles table for which the comment is being created.
   * @param body Comment creation payload containing user-provided content and
   *   optional reply threading information, mapped to the
   *   discussion_board_comments model’s creatable fields.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminuserAuth()
    adminUser: AdminuserPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardComment.ICreate,
  ): Promise<IDiscussionBoardComment> {
    try {
      return await postDiscussionBoardAdminUserArticlesArticleIdComments({
        adminUser,
        articleId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing discussion_board_comments record for a given article and
   * comment pair.
   *
   * Update an existing comment that belongs to a specific discussion board
   * article.
   *
   * This operation enables an authenticated user—either the original member
   * author or a privileged administrator—to modify the content of a comment
   * that has previously been created on a discussion board article. The target
   * comment is located using the `articleId` and `commentId` path parameters,
   * which map respectively to the primary key of the
   * `discussion_board_articles` model and the primary key of the
   * `discussion_board_comments` model. By requiring both identifiers, the API
   * ensures that the comment being updated is indeed associated with the
   * specified article, protecting against accidental or malicious updates
   * across article boundaries.
   *
   * The request body is represented by the `IDiscussionBoardComment.IUpdate`
   * DTO, which corresponds to the subset of `discussion_board_comments` fields
   * that are allowed to change after creation. In most cases this will include
   * the textual content of the comment and potentially an `edited` flag or
   * similar metadata, while immutable fields like the comment’s identifier,
   * original creation timestamp, and foreign keys to the article and author
   * remain untouched. The service maps only these permitted fields to the
   * underlying Prisma update on the `discussion_board_comments` table, thereby
   * honoring the schema’s non-null and length constraints as described in its
   * comments.
   *
   * Ownership and permission checks are enforced using the ownership subtype
   * tables `discussion_board_comment_of_memberusers` and
   * `discussion_board_comment_of_adminusers`, along with any restriction
   * information from `discussion_board_memberuser_restrictions`. For
   * member-authored comments, the service verifies that the current
   * authenticated member user matches the owner recorded in the corresponding
   * subtype row and that the account is not currently restricted from editing
   * content. For administrator-authored comments, or when admins are allowed to
   * edit member comments for moderation purposes, the service ensures that the
   * authenticated admin user has appropriate privileges according to the
   * moderation rules defined in the requirements and schema documentation.
   *
   * The endpoint is secured for authenticated actors only, with
   * `authorizationActors` indicating that both member and admin roles may
   * access it, though their effective permissions differ according to business
   * rules. On success, the API returns the updated `IDiscussionBoardComment`
   * DTO reflecting the latest persisted state, allowing clients to update the
   * displayed comment in place. Error responses include 404 when either the
   * article or comment cannot be found, 403 for insufficient permissions or
   * restrictions, and 400-level responses for invalid update payloads—such as
   * content that violates length limits or other validation rules derived from
   * the Prisma schema comments.
   *
   * @param connection
   * @param articleId Unique identifier of the article in
   *   discussion_board_articles to which the target comment belongs.
   * @param commentId Unique identifier of the comment in
   *   discussion_board_comments that is to be updated.
   * @param body Comment update payload containing only the fields of
   *   discussion_board_comments that are allowed to be modified after creation,
   *   such as the content body.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":commentId")
  public async update(
    @AdminuserAuth()
    adminUser: AdminuserPayload,
    @TypedParam("articleId")
    articleId: string & tags.Format<"uuid">,
    @TypedParam("commentId")
    commentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardComment.IUpdate,
  ): Promise<IDiscussionBoardComment> {
    try {
      return await putDiscussionBoardAdminUserArticlesArticleIdCommentsCommentId(
        {
          adminUser,
          articleId,
          commentId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
