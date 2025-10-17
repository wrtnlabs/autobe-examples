import { Controller } from "@nestjs/common";
import { TypedRoute, TypedBody, TypedParam } from "@nestia/core";
import typia, { tags } from "typia";
import { postDiscussionBoardMemberAppeals } from "../../../../providers/postDiscussionBoardMemberAppeals";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { patchDiscussionBoardMemberAppeals } from "../../../../providers/patchDiscussionBoardMemberAppeals";
import { getDiscussionBoardMemberAppealsAppealId } from "../../../../providers/getDiscussionBoardMemberAppealsAppealId";
import { putDiscussionBoardMemberAppealsAppealId } from "../../../../providers/putDiscussionBoardMemberAppealsAppealId";

import { IDiscussionBoardAppeal } from "../../../../api/structures/IDiscussionBoardAppeal";
import { IPageIDiscussionBoardAppeal } from "../../../../api/structures/IPageIDiscussionBoardAppeal";

@Controller("/discussionBoard/member/appeals")
export class DiscussionboardMemberAppealsController {
  /**
   * Submit a new appeal to contest a moderation decision.
   *
   * This operation enables members to exercise their right to appeal moderation
   * decisions by submitting a formal appeal request to the
   * discussion_board_appeals table. The appeal system is a cornerstone of fair
   * and transparent content moderation, providing users with recourse when they
   * believe a moderation action was taken in error or was disproportionate to
   * the violation.
   *
   * Members can appeal various types of moderation decisions including warnings
   * (first, second, or final warnings from the discussion_board_warnings
   * table), temporary suspensions (from discussion_board_suspensions),
   * permanent bans (from discussion_board_bans if marked as appealable), and
   * content removal decisions (from discussion_board_moderation_actions). Each
   * appeal requires the user to provide a substantive written explanation
   * between 100 and 1000 characters explaining why the decision should be
   * reversed, along with optional additional evidence or context.
   *
   * The operation performs comprehensive validation before creating the appeal
   * record. It verifies that the moderation decision being appealed actually
   * exists and belongs to the requesting user, that the decision is within the
   * appeal window (typically 30 days from the moderation action), that the
   * decision has not already been appealed (one appeal per decision), and that
   * appealable bans are marked as appealable in the bans table. For
   * non-appealable decisions such as bans for illegal content or severe
   * threats, the system rejects the appeal submission with a clear
   * explanation.
   *
   * Upon successful validation, the system creates a new appeal record
   * capturing the appealed moderation action identifier (and specific IDs for
   * appealed warnings, suspensions, or bans), the member's appeal explanation,
   * any additional evidence provided, and sets the initial status to
   * pending_review. The system generates a unique appeal ID and records the
   * submission timestamp for tracking review timelines. Administrators are
   * immediately notified of the new appeal submission through the notification
   * system, adding it to their appeal review queue prioritized by submission
   * time and appeal type urgency.
   *
   * The user receives confirmation that their appeal was successfully submitted
   * along with information about the expected review timeline (warnings: 7
   * days, suspensions: 3 days due to time-sensitive nature, bans: 14 days for
   * thorough review). The confirmation includes the assigned appeal ID for
   * reference and instructions on how to check appeal status.
   *
   * Business rules enforced during appeal submission include the requirement
   * that the user must be the subject of the moderation action being appealed,
   * that the appeal window has not closed (typically 30 days from the
   * moderation action date), that the user has not exceeded the maximum of 5
   * active appeals at any time, and that the appeal explanation meets minimum
   * quality standards (100-1000 characters, substantive content, not just
   * personal attacks on moderators).
   *
   * This operation integrates with the moderation system defined in the
   * moderation requirements document, specifically implementing the appeal
   * submission workflow. It relates to the GET /appeals/{appealId} operation
   * which allows users to check their appeal status, and to
   * administrator-specific appeal review endpoints where decisions are
   * rendered. The appeal process is designed to balance user rights with
   * efficient moderation, ensuring that legitimate appeals receive fair
   * consideration while preventing abuse of the appeal system as a delay
   * tactic.
   *
   * @param connection
   * @param body Appeal submission details including the moderation decision
   *   being contested and user's explanation
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IDiscussionBoardAppeal.ICreate,
  ): Promise<IDiscussionBoardAppeal> {
    try {
      return await postDiscussionBoardMemberAppeals({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Search and retrieve own appeals for moderation decisions with filtering and
   * pagination.
   *
   * This operation retrieves a filtered and paginated list of appeals submitted
   * by the authenticated member contesting their own moderation decisions on
   * the discussion board platform. Appeals represent a critical component of
   * the platform's fair and transparent moderation system, providing users with
   * recourse when they believe moderation actions (warnings, suspensions, bans,
   * or content removals) were issued unfairly or incorrectly.
   *
   * The operation supports comprehensive search and filtering capabilities
   * including filtering by appeal status (pending_review, under_review,
   * approved, denied, modified), submission date ranges, decision outcome, and
   * the type of moderation action being appealed (warning, suspension, ban,
   * content removal). Users can sort results by submission date, review date,
   * or status to organize their view of their appeal history.
   *
   * For members accessing this endpoint, the operation implements strict access
   * control by automatically filtering results to show only appeals submitted
   * by the authenticated user. This ensures members can track their own appeal
   * submissions, view decision outcomes, and understand the resolution of their
   * contested moderation actions. Members use this endpoint to monitor the
   * status of their appeals as they progress from pending_review through
   * administrator review to final decisions.
   *
   * The response includes complete appeal information for each result: the
   * appeal explanation provided by the member (100-1000 characters), any
   * additional evidence or context submitted, the current appeal status, the
   * assigned reviewing administrator (if applicable), the administrator's
   * decision (uphold, reverse, or modify), detailed decision reasoning,
   * descriptions of any corrective actions taken for approved appeals (warning
   * removal, suspension lift, account restoration), and complete timestamp
   * tracking from submission through review to resolution.
   *
   * Each appeal result includes references to the underlying moderation action
   * being contested, allowing members to view the complete context including
   * the original violation, moderator reasoning, and the moderation history
   * that led to the appeal. This comprehensive context helps members understand
   * appeal decisions and learn from the moderation process.
   *
   * The operation supports pagination for efficient handling when members have
   * submitted multiple appeals over time, with configurable page sizes and
   * navigation through multi-page result sets. Sorting options enable members
   * to organize appeals by submission date, review status, or resolution
   * outcome.
   *
   * Security and privacy considerations include automatic filtering that
   * restricts members to viewing only their own appeals (cannot see other
   * users' appeals), validation that the requesting user is authenticated with
   * valid member role, protection of sensitive moderation details, and
   * comprehensive audit logging of appeal searches for accountability as
   * specified in the moderation audit requirements.
   *
   * @param connection
   * @param body Search criteria, filters, and pagination parameters for appeal
   *   queries including status filters, date ranges, and sorting preferences
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IDiscussionBoardAppeal.IRequest,
  ): Promise<IPageIDiscussionBoardAppeal> {
    try {
      return await patchDiscussionBoardMemberAppeals({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific appeal submission.
   *
   * This operation retrieves comprehensive details about a single appeal record
   * identified by its unique appeal ID from the discussion_board_appeals table.
   * Appeals represent formal challenges to moderation decisions and are a
   * critical component of the platform's fair moderation system.
   *
   * The appeal record includes the member who submitted the appeal, which
   * moderation decision is being contested (warning, suspension, ban, or
   * moderation action), the user's written explanation for why the decision
   * should be reversed, any additional evidence provided, the current status of
   * the appeal (pending_review, under_review, approved, denied, modified), and
   * if resolved, the administrator's decision with detailed reasoning.
   *
   * This endpoint serves multiple purposes depending on the authenticated
   * user's role. Members can check the status and details of their own appeal
   * submissions to track progress through the review process. Administrators
   * use this endpoint to retrieve full appeal information when conducting
   * reviews, examining the original moderation action context, user's
   * arguments, and all relevant evidence before making a decision. Moderators
   * may view appeals related to their moderation actions to understand user
   * concerns and learn from reversed decisions.
   *
   * Security considerations include ensuring that members can only view their
   * own appeals unless they have moderator or administrator privileges. The
   * operation validates that the appeal exists and that the requesting user has
   * appropriate permissions before returning sensitive moderation data. All
   * appeal information, including user explanations and administrator
   * decisions, must be handled with confidentiality.
   *
   * The response includes complete details about the original moderation
   * decision being appealed, allowing reviewers to understand the full context.
   * This includes the moderation action type, target content snapshots,
   * violation categories, and the original moderator's reasoning. For appeals
   * of warnings, the warning level and expiration information is included. For
   * suspension appeals, the suspension duration and dates are provided. For ban
   * appeals, the ban reason and appealability status are included.
   *
   * Related operations that work with appeals include POST /appeals for
   * submitting new appeal requests, and administrator-specific endpoints for
   * processing appeals and making decisions. This operation is typically used
   * after a moderation action has been taken and the affected user wishes to
   * contest the decision through the formal appeal process defined in the
   * platform's moderation system requirements.
   *
   * @param connection
   * @param appealId Unique identifier of the appeal record to retrieve
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":appealId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("appealId")
    appealId: string & tags.Format<"uuid">,
  ): Promise<IDiscussionBoardAppeal> {
    try {
      return await getDiscussionBoardMemberAppealsAppealId({
        member,
        appealId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing appeal submission for a moderation decision.
   *
   * This operation enables members to modify an existing appeal they submitted
   * contesting a moderation decision including warnings, suspensions, bans, or
   * content removals. Members can update their appeal_explanation and
   * additional_evidence to provide stronger arguments or additional context
   * before administrator review.
   *
   * The operation strictly validates that the authenticated user is the
   * original appellant who submitted the appeal and that the appeal remains in
   * 'pending_review' status. Appeals that have progressed to 'under_review' or
   * been resolved ('approved', 'denied', 'modified') cannot be edited to
   * maintain the integrity of the review process and prevent manipulation after
   * administrator engagement.
   *
   * Security considerations include verifying member ownership of the appeal,
   * ensuring the appeal exists and is accessible, and preventing modifications
   * to appeals outside the pending state. The operation updates the appeal
   * record's appeal_explanation and additional_evidence fields while preserving
   * the original submission timestamp and updating the updated_at timestamp to
   * track modifications.
   *
   * Validation rules enforce that appeal_explanation remains between 100 and
   * 1000 characters as required by business rules. The additional_evidence
   * field is optional but must not exceed reasonable length limits if provided.
   * The operation validates all input against the same constraints as appeal
   * creation to maintain data quality.
   *
   * This operation integrates with the moderation system by allowing users to
   * strengthen their appeals before administrator review, supporting the
   * platform's commitment to fair and transparent moderation. Users can refine
   * their arguments and provide additional context that may influence the
   * administrator's decision, supporting the appeals process defined in the
   * moderation requirements.
   *
   * Related operations include viewing appeal status and details (GET
   * /appeals/{appealId}), creating new appeals (POST /appeals), and the
   * administrator appeal review workflow. Users should consult their appeal
   * status before attempting updates to ensure the appeal is still in a
   * modifiable state.
   *
   * @param connection
   * @param appealId Unique identifier of the appeal to update
   * @param body Updated appeal information including modified explanation and
   *   additional evidence
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":appealId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("appealId")
    appealId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IDiscussionBoardAppeal.IUpdate,
  ): Promise<IDiscussionBoardAppeal> {
    try {
      return await putDiscussionBoardMemberAppealsAppealId({
        member,
        appealId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
