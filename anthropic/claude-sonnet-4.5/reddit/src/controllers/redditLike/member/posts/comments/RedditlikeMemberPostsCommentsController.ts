import { Controller } from "@nestjs/common";
import { TypedRoute, TypedParam, TypedBody } from "@nestia/core";
import typia, { tags } from "typia";
import { postRedditLikeMemberPostsPostIdComments } from "../../../../../providers/postRedditLikeMemberPostsPostIdComments";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";

import { IRedditLikeComment } from "../../../../../api/structures/IRedditLikeComment";

@Controller("/redditLike/member/posts/:postId/comments")
export class RedditlikeMemberPostsCommentsController {
  /**
   * Create a new comment on a specific post as an authenticated member.
   *
   * Create a new comment on a specific post, enabling authenticated members to
   * participate in discussions and engage with community content. This
   * operation is fundamental to the platform's engagement model, transforming
   * static posts into dynamic conversations through user-generated commentary.
   *
   * The operation implements the comment creation workflow specified in Comment
   * System Requirements section 2. When a member submits a comment, the system
   * validates the content meets requirements (1-10,000 characters, non-empty
   * after trimming whitespace), verifies the user is authenticated, confirms
   * the target post exists and is not deleted or locked, and creates the
   * comment record in the reddit_like_comments table with appropriate metadata
   * including author, post reference, content text, depth level, and
   * initialization timestamps.
   *
   * Authentication is strictly required for comment creation. Guest users
   * (unauthenticated visitors) cannot create comments and must register or log
   * in to participate. When a guest attempts to comment, they are prompted to
   * authenticate per requirements section 2.1. This ensures all comments are
   * attributed to registered users, enabling reputation tracking through karma
   * and maintaining accountability for community discussions.
   *
   * The operation supports both top-level comments (direct replies to posts)
   * and nested replies (replies to other comments), managed through the
   * parent_comment_id field in the request body. When creating a top-level
   * comment, the parent_comment_id is omitted or null. When creating a nested
   * reply, the parent_comment_id references the comment being replied to, and
   * the system calculates the appropriate depth level (parent depth + 1). The
   * system enforces a maximum nesting depth of 10 levels per requirements
   * section 4.1, preventing replies to comments at the maximum depth.
   *
   * Upon successful comment creation, the system performs several integrated
   * actions: initializes vote score to zero, enables immediate voting by other
   * users, increments the parent post's comment count (denormalized in
   * mv_reddit_like_post_metrics for performance), awards initial comment karma
   * of zero to the author (karma increases as votes are received), positions
   * the comment in the thread hierarchy based on its parent relationship, and
   * makes the comment immediately visible in comment listings with the selected
   * sorting algorithm.
   *
   * Validation rules enforced include: verifying the target post exists and is
   * accessible, confirming the post is not locked by moderators (which prevents
   * new comments), checking the user is not banned from the community where the
   * post exists, validating comment text is between 1 and 10,000 characters
   * after trimming whitespace, sanitizing content to prevent XSS attacks and
   * injection vulnerabilities, and enforcing rate limits (maximum 10 comments
   * per minute per requirements section 11.2) to prevent spam.
   *
   * Security considerations include authentication token validation, session
   * verification, CSRF protection for state-changing operations, HTML/script
   * tag sanitization to prevent malicious content injection, IP address
   * tracking for rate limiting and abuse detection, and URL validation for any
   * links included in comment text. The operation logs all comment creation
   * events for audit and analytics purposes.
   *
   * The newly created comment is immediately available for other users to view,
   * vote on, and reply to, creating real-time engagement dynamics. The comment
   * appears in the post's comment thread according to the current sorting
   * method (Best, Top, New, Controversial, Old), and users can interact with it
   * through voting, replying, or reporting if it violates rules. The comment
   * author can edit their comment within 24 hours per requirements section 5.1
   * and delete it at any time per requirements section 5.4.
   *
   * Error handling includes validation errors (empty comment, exceeds character
   * limit), authentication errors (user not logged in, session expired),
   * permission errors (user banned from community, post is locked), and system
   * errors (database failures, network timeouts). All errors provide clear
   * user-facing messages explaining the issue and how to resolve it, with
   * detailed error information logged for troubleshooting.
   *
   * @param connection
   * @param postId Unique identifier of the post on which the comment is being
   *   created
   * @param body Comment creation data including the text content and optional
   *   parent comment reference for nested replies
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("postId")
    postId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IRedditLikeComment.ICreate,
  ): Promise<IRedditLikeComment> {
    try {
      return await postRedditLikeMemberPostsPostIdComments({
        member,
        postId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
