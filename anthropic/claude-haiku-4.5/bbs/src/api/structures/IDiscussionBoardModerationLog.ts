import { tags } from "typia";

import { IPagination } from "./IPagination";
import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "./IDiscussionBoardComment";
import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IDiscussionBoardModerationLog {
  /**
   * Advanced search and filtering parameters for content moderation review.
   *
   * This request DTO allows moderators to specify sophisticated filter
   * criteria and pagination parameters to retrieve articles and comments
   * requiring moderation attention. The operation supports complex queries
   * with multiple optional filters (author, violation type, date range,
   * priority) and flexible result sorting to enable efficient content review
   * workflows.
   *
   * All filter parameters support NULL/optional values to disable that
   * particular filter. The required parameters (filter_type, status_filter,
   * sort_by, page, page_size) establish the basic structure of the query
   * while optional parameters allow narrowing results to specific subsets of
   * content.
   *
   * Pagination is implemented via page (1-indexed) and page_size (5-100
   * items), preventing performance degradation with large datasets. Results
   * are sorted according to sort_by parameter, enabling moderators to
   * prioritize their review queue by urgency, recency, or view count.
   */
  export type IContentRequest = {
    /**
     * Type of content to filter for moderation review.
     *
     * Allowed values: 'article' (retrieve articles for review), 'comment'
     * (retrieve comments for review), 'all' (retrieve both articles and
     * comments in combined results).
     *
     * Determines which tables to query and which content type filters apply
     * to the request.
     */
    filter_type: string;

    /**
     * Filter by moderation/publication status of content.
     *
     * Allowed values:
     *
     * - 'published': Show active, published content (status = 'published')
     * - 'flagged': Show content flagged for moderation review
     * - 'removed': Show content removed by moderators (status = 'moderated'
     *   or deleted_at is not NULL)
     * - 'all': Show all content regardless of status
     *
     * Enable moderators to focus on specific moderation queues (pending
     * review vs already actioned content).
     */
    status_filter: string;

    /**
     * Optional UUID of a specific member to filter results by author.
     *
     * When provided, returns only articles or comments authored by the
     * specified member. Used to review all content from a specific user or
     * investigate patterns of violations from particular members.
     *
     * NULL to disable author filtering and show results from all authors.
     */
    author_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Optional filter by violation type category.
     *
     * Allowed values when provided: 'spam' (repetitive promotional or
     * off-topic content), 'harassment' (targeted threats or personal
     * attacks), 'inappropriate_content' (offensive, graphic, or adult
     * content), 'off_topic' (completely unrelated to discussion board
     * purpose), 'misinformation' (false or misleading claims),
     * 'copyright_violation' (wholesale copying without fair use),
     * 'illegal_content' (instructions for illegal acts or illegal market
     * solicitation).
     *
     * When populated, filters to show only content violations matching the
     * specified type. NULL to disable violation type filtering and show all
     * violations.
     */
    violation_type?: string | null | undefined;

    /**
     * Optional start timestamp for filtering content by creation date
     * range.
     *
     * ISO 8601 format in UTC (e.g., '2024-01-15T10:00:00Z'). When provided
     * with date_range_to, filters to show only content created on or after
     * this timestamp.
     *
     * Used with date_range_to to find content within specific time windows
     * (e.g., flagged content from last 24 hours, weekend discussions,
     * specific event date ranges).
     *
     * NULL to disable date filtering.
     */
    date_range_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional end timestamp for filtering content by creation date range.
     *
     * ISO 8601 format in UTC (e.g., '2024-01-15T23:59:59Z'). When provided
     * with date_range_from, filters to show only content created on or
     * before this timestamp.
     *
     * Used with date_range_from to find content within specific time
     * windows.
     *
     * NULL to disable date filtering.
     */
    date_range_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional filter by moderation priority based on violation severity.
     *
     * Allowed values when provided: 'critical' (severe violations like
     * illegal content or threats requiring immediate action), 'high'
     * (serious violations like harassment or hate speech), 'normal'
     * (typical policy violations requiring review), 'low' (minor issues or
     * first-time violations from good-standing members).
     *
     * Enables moderators to focus on high-priority items first. Priority is
     * determined by violation type and member violation history (repeat
     * offenders get higher priority).
     *
     * NULL to disable priority filtering and show all content.
     */
    priority_level?: string | null | undefined;

    /**
     * Sort order for returned results.
     *
     * Allowed values:
     *
     * - 'priority': Sort by moderation priority (critical first, then high,
     *   normal, low)
     * - 'created_date': Sort by content creation date (newest first)
     * - 'updated_date': Sort by last modification date (most recently updated
     *   first)
     * - 'view_count': Sort by article view count (most viewed first, for
     *   articles only)
     * - 'violation_frequency': Sort by member's total violation count
     *   (frequent violators first)
     *
     * Default should be 'priority' if not specified. Allows moderators to
     * organize their review queue by urgency or other criteria.
     */
    sort_by: string;

    /**
     * Page number for pagination of results (1-indexed).
     *
     * Default to page 1 if not provided. Used with page_size to implement
     * pagination for large result sets.
     *
     * Enables moderators to navigate through many flagged items
     * efficiently.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of results to return per page for pagination.
     *
     * Allowed range: 5 to 100 items. Default to 20 if not specified.
     *
     * Larger page sizes return more results but may impact performance.
     * Moderators can adjust based on their display resolution and workflow
     * preferences.
     */
    page_size: number &
      tags.Type<"int32"> &
      tags.Minimum<5> &
      tags.Maximum<100>;
  };

  /**
   * Request parameters for filtering and paginating moderation history
   * retrieval for a specific member.
   *
   * This DTO allows moderators to specify how they want to retrieve and
   * filter the member's moderation history, including violations and
   * enforcement actions. The request supports pagination to handle members
   * with extensive violation records, as well as filtering by violation type
   * and date range to focus on specific moderation concerns.
   *
   * All parameters are optional, allowing moderators to request the complete
   * history or apply specific filters based on their investigation needs.
   */
  export type IMemberHistoryRequest = {
    /**
     * Page number for pagination (1-indexed). Specifies which page of
     * moderation history results to retrieve. Defaults to page 1 if not
     * specified. Used in conjunction with limit to paginate through large
     * violation records.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Number of records per page. Specifies how many violation or
     * moderation log records to return per page. Defaults to 20 if not
     * specified. Maximum of 100 records per page for performance.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional filter by specific violation type category. Valid values:
     * 'spam', 'harassment', 'inappropriate_content', 'off_topic',
     * 'misinformation', 'copyright_violation', 'illegal_content'. When
     * specified, only violations matching this type are included in
     * results. Null or omitted to include all violation types.
     */
    violation_type?: string | undefined;

    /**
     * Optional filter for violations occurring on or after this date.
     * Specified in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). Used to filter
     * history to a specific time window for investigation purposes. Null or
     * omitted to include all violations regardless of date.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional filter for violations occurring on or before this date.
     * Specified in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ). When combined
     * with start_date, creates a date range filter. Null or omitted to
     * include all violations up to current date.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field to sort results by. Valid values: 'violation_date',
     * 'created_at', 'action_type'. Determines ordering of moderation
     * history results. Defaults to 'violation_date' if not specified,
     * showing most recent violations first.
     */
    sort_by?: string | undefined;

    /**
     * Sort direction. Valid values: 'asc' (ascending), 'desc' (descending).
     * Typically 'desc' to show most recent violations first. Defaults to
     * 'desc' if not specified.
     */
    order?: string | undefined;
  };

  /**
   * Complete moderation history for a specific member including all recorded
   * violations, enforcement actions, and current account status.
   *
   * This DTO provides comprehensive visibility into a member's standing with
   * the platform by aggregating three key pieces of information: the member's
   * current account status and standing, all recorded policy violations with
   * reasons and dates, and all enforcement actions taken by moderators in
   * response to violations.
   *
   * The response enables moderators to make informed decisions about further
   * enforcement actions by reviewing the complete history of the member's
   * interactions with community guidelines. It includes details about what
   * violations occurred, when they occurred, why they were recorded, and what
   * specific moderation actions were taken in response.
   */
  export type IMemberModerationHistory = {
    /**
     * Current member account information and status. Includes member ID,
     * email, account creation date, current account status
     * (active/suspended/banned), and any active suspensions or bans with
     * dates.
     */
    member: IDiscussionBoardModerationLog.IMemberProfile;

    /**
     * Array of all recorded policy violations for this member. Each
     * violation records when the policy violation occurred, what type of
     * violation it was, the reason/explanation, and any associated
     * moderation action. Ordered by date (most recent first) by default.
     * Empty array if member has no violations.
     */
    violations: IDiscussionBoardModerationLog.IViolationRecord[];

    /**
     * Array of all enforcement actions taken against this member by
     * moderators. Each record shows what action was taken (warning,
     * suspension, ban, etc.), when it was taken, by which moderator, and
     * the reason provided. Ordered by date (most recent first) by default.
     * Empty array if no moderation actions have been taken.
     */
    moderation_actions: IDiscussionBoardModerationLog.IModerationActionRecord[];

    /**
     * Summary statistics about the member's violations for quick overview.
     * Includes total violation count in last 30 days and last 90 days,
     * breakdown by violation type, and indication of whether automatic
     * sanctions (suspension/ban) have been triggered based on violation
     * thresholds.
     */
    violation_summary: IDiscussionBoardModerationLog.IViolationSummary;

    /**
     * Pagination metadata for the violations list. Indicates current page,
     * total pages, total violation count, and records per page. Allows
     * moderator to navigate through large violation histories.
     */
    pagination: IPagination;
  };

  /**
   * Current member account profile information and status for moderation
   * context.
   *
   * This DTO provides the core information about a member account that
   * moderators need to understand when reviewing moderation history. It
   * includes identification information (id, email), account lifecycle
   * timestamps (created_at, updated_at), current account status reflecting
   * any restrictions or actions taken against the account, suspension
   * expiration tracking when applicable, and activity metrics showing member
   * contribution level.
   *
   * The account_status field indicates the member's current standing:
   * 'active' for normal participation, 'suspended' for temporary access
   * restrictions (typically 7 days), or 'banned' for permanent access denial.
   * The suspended_until field is only populated when account_status is
   * 'suspended', showing the exact date/time when the suspension expires and
   * the member can resume normal activity.
   *
   * Activity metrics (total_articles, total_comments) provide context about
   * member's engagement level and contribution history, helping moderators
   * understand whether the member is a casual user or highly active
   * contributor when making enforcement decisions.
   */
  export type IMemberProfile = {
    /**
     * Unique identifier of the member account. System-generated UUID used
     * for reference throughout the system. Primary key from
     * discussion_board_members.id table. Immutable throughout account
     * lifetime.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member's email address used for authentication and account
     * identification. Displayed to moderators for account identification
     * and contact purposes. Corresponds to discussion_board_members.email
     * field. Unique across all member accounts in the system.
     */
    email: string & tags.Format<"email">;

    /**
     * Current status of the member's account indicating access
     * restrictions. Valid values: 'active' (normal participation allowed,
     * no restrictions), 'suspended' (temporary access denial, typically 7
     * days, member cannot login), 'banned' (permanent access denial, member
     * cannot login or create new accounts). Corresponds to
     * discussion_board_members.account_status field. Indicates what
     * restrictions are currently applied to this member.
     */
    account_status: "active" | "suspended" | "banned";

    /**
     * If account_status is 'suspended', this is the date/time when the
     * suspension expires and the account will be reactivated to 'active'
     * status automatically. Specified in ISO 8601 UTC format (e.g.,
     * '2024-01-22T15:30:00Z'). NULL if account is not currently suspended
     * (account_status is 'active' or 'banned'). Derived from
     * discussion_board_members record when suspension was applied. Helps
     * moderators understand when temporary suspension will expire and
     * member regains access.
     */
    suspended_until?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when member account was created at registration. Specified
     * in ISO 8601 UTC format. System-generated and immutable. Corresponds
     * to discussion_board_members.created_at field. Indicates how long the
     * account has existed, useful context for new vs. established members
     * when assessing violation severity.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when member account information was last modified.
     * Specified in ISO 8601 UTC format. Updated when account details change
     * (password reset, email update, status changes). Corresponds to
     * discussion_board_members.updated_at field. Used for audit trail
     * tracking of account modifications.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Total number of articles created by this member across all time
     * (cumulative count). Derived from COUNT(*) of
     * discussion_board_articles where discussion_board_member_id matches
     * this member's id and deleted_at is NULL (excluding deleted articles).
     * Used to provide context about member's activity level and
     * contribution to the platform. Helps moderators assess whether member
     * is casual contributor or prolific poster.
     */
    total_articles: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of comments posted by this member across all time
     * (cumulative count). Derived from COUNT(*) of
     * discussion_board_comments where discussion_board_member_id matches
     * this member's id and deleted_at is NULL (excluding deleted comments).
     * Used to provide context about member's participation in discussions.
     * Helps moderators understand member's engagement frequency and
     * discussion participation patterns.
     */
    total_comments: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Record of a single policy violation committed by a member.
   *
   * Each violation record documents when a member violated community
   * guidelines, what type of violation it was, why it was recorded, and which
   * moderation action (if any) was taken in response. Multiple violations are
   * accumulated to track patterns and trigger automatic sanctions: 3
   * violations within 30 days triggers 7-day account suspension, 5 violations
   * within 90 days triggers permanent account ban.
   *
   * Violation records are stored in the discussion_board_user_violations
   * table and linked to moderation actions through the moderation_log_id
   * field. Violation dates are critical for threshold calculations - the
   * system queries violations with violation_date within specific time
   * windows (last 30 days, last 90 days) to determine if automatic
   * enforcement thresholds have been exceeded.
   *
   * Each violation type corresponds to specific community guideline
   * categories, enabling moderators to understand violation patterns (e.g.,
   * user with multiple 'harassment' violations vs. single 'off_topic'
   * violation indicates different enforcement need).
   */
  export type IViolationRecord = {
    /**
     * Unique identifier of this violation record. System-generated UUID
     * primary key from discussion_board_user_violations.id. Immutable
     * unique identifier for reference in moderation logs and audit trails.
     * Used to link violation to enforcement actions through
     * moderation_log_id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Category or type of policy violation committed. Corresponds to
     * discussion_board_user_violations.violation_type field. Valid values
     * from community guidelines categories:
     *
     * - 'spam': Repetitive promotional content, unsolicited commercial
     *   messages, or unwanted duplicate posts intended to clutter
     *   discussions
     * - 'harassment': Targeted personal attacks, abuse, threatening language,
     *   or coordinated attacks against specific individuals
     * - 'inappropriate_content': Graphic violence, adult content, hateful
     *   language, or material violating community standards
     * - 'off_topic': Content completely unrelated to economics or political
     *   discussion, off-platform personal matters
     * - 'misinformation': Deliberately false or misleading information
     *   presented as fact, conspiracy theories without basis, manipulated
     *   data
     * - 'copyright_violation': Unauthorized reproduction of copyrighted
     *   content, wholesale copying without fair use, intellectual property
     *   infringement
     * - 'illegal_content': Content promoting or instructing illegal
     *   activities, illegal market solicitations, dangerous instructions
     *
     * Enables violation categorization, pattern analysis (e.g., user
     * repeatedly violating 'harassment' guideline needs intervention), and
     * appropriate enforcement response selection.
     */
    violation_type:
      | "spam"
      | "harassment"
      | "inappropriate_content"
      | "off_topic"
      | "misinformation"
      | "copyright_violation"
      | "illegal_content";

    /**
     * Detailed explanation of why this violation was recorded. Corresponds
     * to discussion_board_user_violations.reason field. Provides specific
     * context about what policy was violated, which content triggered the
     * violation, and supporting details for the determination. Examples:
     * 'Multiple personal attacks directed at other users in comment
     * thread', 'Exact duplicate of previous article posted 30 minutes
     * earlier', 'External promotion with commercial links'. Helps members
     * understand what they did wrong if they appeal the action. Used for
     * moderator audit trail and transparency in enforcement decisions.
     */
    reason?: string | undefined;

    /**
     * Date and time when the violation occurred (when the member committed
     * the policy violation). Corresponds to
     * discussion_board_user_violations.violation_date field. Specified in
     * ISO 8601 UTC format (e.g., '2024-01-15T14:30:00Z'). CRITICAL for
     * calculating 30-day and 90-day violation windows for automatic
     * sanctions: system queries COUNT(violations) WHERE violation_date >=
     * NOW() - INTERVAL 30 days to check suspension threshold (3
     * violations), and COUNT(violations) WHERE violation_date >= NOW() -
     * INTERVAL 90 days to check ban threshold (5 violations). May differ
     * from created_at if violation is recorded after the fact (e.g.,
     * moderator reviewing comment hours later).
     */
    violation_date: string & tags.Format<"date-time">;

    /**
     * Date and time when this violation record was created in the system.
     * Corresponds to discussion_board_user_violations.created_at field.
     * Specified in ISO 8601 UTC format. System-generated timestamp when
     * moderator records the violation. May differ from violation_date if
     * violation is recorded after the fact. Used for audit trail tracking
     * and ordering violation records chronologically.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Reference to the associated moderation action record if a specific
     * enforcement action was taken in response to this violation.
     * Corresponds to discussion_board_user_violations.moderation_log_id
     * field. Foreign key reference to discussion_board_moderation_logs.id.
     * UUID of the moderation log entry if an action was taken (suspension,
     * ban, warning, content removal, etc.). NULL if violation is recorded
     * but no immediate action was taken yet (e.g., first minor violation,
     * awaiting pattern confirmation, or under moderator review). Links
     * violation to enforcement action for complete audit trail showing
     * violation → action chain.
     */
    moderation_action_id?: (string & tags.Format<"uuid">) | null | undefined;
  };

  /**
   * Record of a specific enforcement action taken by a moderator in response
   * to policy violations.
   *
   * Each moderation action documents what enforcement step was taken
   * (warning, suspension, ban, etc.), when it was taken, by which moderator,
   * and the reason provided. Complete audit trail of moderator decisions
   * enables transparency and accountability.
   */
  export type IModerationActionRecord = {
    /**
     * Unique identifier of this moderation action record. System-generated
     * UUID for reference in audit logs.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of enforcement action taken. Valid values: 'warning_issued'
     * (formal warning email sent), 'suspend_user' (7-day temporary access
     * suspension), 'ban_user' (permanent access ban), 'remove_content'
     * (article or comment deleted). Standardized enumeration of enforcement
     * actions available to moderators.
     */
    action_type: string;

    /**
     * Type of entity targeted by this action. Valid values: 'member'
     * (action on member account itself), 'article' (article removed),
     * 'comment' (comment removed). Indicates what was targeted by the
     * enforcement action.
     */
    target_type: string;

    /**
     * Unique identifier of the moderator who took this action. Provides
     * transparency about which moderator made the enforcement decision.
     * Useful for audit trails and appeal processes.
     */
    moderator_id: string & tags.Format<"uuid">;

    /**
     * Moderator-provided reason or explanation for this enforcement action.
     * Documents why the action was taken and what violation triggered it.
     * Enables transparent communication with member about enforcement
     * rationale.
     */
    reason?: string | null | undefined;

    /**
     * Date and time when this moderation action was executed. Specified in
     * ISO 8601 UTC format. Used for chronological ordering of enforcement
     * actions.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Summary statistics about user policy violations on the platform. Provides
   * key metrics about violation volume, member involvement, and enforcement
   * threshold status. Used in moderation dashboard to quickly assess
   * violation trends and identify members approaching automatic enforcement
   * thresholds.
   *
   * The system uses tiered automatic enforcement: 3 violations within 30 days
   * triggers 7-day account suspension, 5 violations within 90 days triggers
   * permanent account ban. This summary helps moderators identify members
   * approaching these thresholds for proactive intervention.
   */
  export type IViolationSummary = {
    /**
     * Total number of policy violations recorded across all members since
     * platform inception. Cumulative count of all violation records in
     * discussion_board_user_violations table. Indicates total enforcement
     * volume on platform.
     */
    total_violations: number & tags.Type<"int32">;

    /**
     * Count of unique members who have at least one recorded policy
     * violation. Indicates how many users have violated community
     * guidelines. Used to assess community health and violation
     * prevalence.
     */
    members_with_violations: number & tags.Type<"int32">;

    /**
     * Count of members with 2 violations in the last 30 days (approaching
     * automatic 7-day suspension threshold of 3 violations). These members
     * are close to automatic temporary suspension. Enables proactive
     * moderator outreach or enforcement.
     */
    members_approaching_suspension: number & tags.Type<"int32">;

    /**
     * Count of members with 4 violations in the last 90 days (approaching
     * automatic permanent ban threshold of 5 violations). These members are
     * close to automatic permanent ban. Indicates need for urgent
     * moderation intervention.
     */
    members_approaching_ban: number & tags.Type<"int32">;

    /**
     * Count of policy violations recorded in the current calendar month.
     * Used to assess violation trend this period and compare against
     * historical baseline. Helps identify if violation rate is increasing
     * or decreasing.
     */
    violations_this_month: number & tags.Type<"int32">;

    /**
     * Top 5 most common violation types by frequency. Each entry shows
     * violation type and count of occurrences. Examples: spam (50
     * violations), harassment (35 violations), off_topic (22 violations).
     * Helps identify most common policy violations for enforcement focus.
     */
    top_violation_types: IDiscussionBoardModerationLog.IViolationTypeCount[];
  };

  /**
   * Request parameters for filtering, searching, and paginating moderation
   * logs. This DTO enables moderators to query the
   * discussion_board_moderation_logs table with advanced filtering
   * capabilities.
   *
   * Moderators can filter moderation actions by multiple dimensions: action
   * type (remove_article, remove_comment, suspend_user, ban_user, etc.) to
   * find specific enforcement categories, target type (article, comment,
   * member) to see actions affecting specific entity types, moderator ID to
   * audit specific moderators' decisions, affected member ID to see all
   * enforcement against a user, and date range to view recent or historical
   * actions. Search capabilities enable finding actions by reason text.
   *
   * The operation supports pagination to manage large result sets of
   * moderation logs. Sorting capabilities allow ordering by timestamp or
   * other relevant fields. This enables comprehensive audit trail review and
   * compliance documentation for moderation activities.
   */
  export type IModerationLogsRequest = {
    /**
     * Page number for pagination (0-based). Specifies which page of results
     * to retrieve. Default is 0 for first page. Combined with limit to
     * enable browsing large result sets of moderation logs.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of moderation log entries per page. Default is 20.
     * Valid range 1-100. Controls result set size for pagination.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * Filter by moderation action type. Valid values: 'remove_article'
     * (article removed by moderator), 'remove_comment' (comment removed by
     * moderator), 'suspend_user' (user account suspended temporarily),
     * 'ban_user' (user account permanently banned), 'restore_article'
     * (deleted article restored), 'restore_comment' (deleted comment
     * restored), 'warning_issued' (user warned about violations),
     * 'flag_content' (content flagged for review). Null or empty means no
     * filtering by action type. Allows targeting specific moderation action
     * categories.
     */
    action_type?: string | undefined;

    /**
     * Filter by moderation target type. Valid values: 'article' (action
     * targeted an article), 'comment' (action targeted a comment), 'member'
     * (action targeted a user account). Null or empty means no filtering by
     * target type. Enables filtering actions affecting specific entity
     * types.
     */
    target_type?: string | undefined;

    /**
     * Filter by moderator who took the action. Provide UUID of the
     * moderator from discussion_board_moderators.id. Null or empty means no
     * filtering by moderator. Enables auditing specific moderators'
     * enforcement decisions.
     */
    discussion_board_moderator_id?: string | undefined;

    /**
     * Filter by affected member. Provide UUID of the member from
     * discussion_board_members.id. Returns only moderation actions that
     * affected this specific member (suspensions, bans, content removals if
     * member is author). Null or empty means no filtering by affected
     * member. Enables viewing all enforcement against a specific user.
     */
    affected_discussion_board_member_id?: string | undefined;

    /**
     * Filter by start date. Only include moderation logs created on or
     * after this date (ISO 8601 format in UTC). Combined with end_date for
     * date range filtering. Null means no start date restriction.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by end date. Only include moderation logs created on or before
     * this date (ISO 8601 format in UTC). Combined with start_date for date
     * range filtering. Null means no end date restriction.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Search text to find moderation logs by reason field. Performs
     * substring matching in the reason text that moderators provided when
     * taking the action. Case-insensitive search. Null or empty means no
     * search filtering.
     */
    search?: string | undefined;

    /**
     * Field to sort by. Valid values: 'created_at' (sort by action
     * timestamp), 'action_type' (sort by action type), 'moderator' (sort by
     * moderator name). Default is 'created_at'. Controls result ordering.
     */
    sort_by?: string | undefined;

    /**
     * Sort direction. Valid values: 'asc' (ascending), 'desc' (descending).
     * Default is 'desc' for reverse chronological order. Combined with
     * sort_by to control result ordering.
     */
    sort_order?: string | undefined;
  };

  /**
   * Complete audit record of a single moderation action taken by a moderator.
   * Captures all details of administrative enforcement including who took the
   * action, what action was taken, what entity was affected, when it
   * occurred, and why the action was necessary. Provides immutable historical
   * record for compliance, transparency, and accountability. Supports
   * polymorphic targeting of articles, comments, or user accounts.
   */
  export type IModerationLog = {
    /**
     * Unique identifier for this moderation log entry. System-generated
     * UUID primary key that uniquely identifies the specific moderation
     * action taken. Used for reference in audit trails and action rollback
     * scenarios.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique identifier of the moderator who performed this moderation
     * action. References discussion_board_moderators.id. Identifies which
     * administrator made the decision for accountability and audit trail
     * purposes.
     */
    moderator_id: string & tags.Format<"uuid">;

    /**
     * Email address of the moderator who performed this action.
     * Denormalized from moderator record for efficient display. Provides
     * human-readable identification of who took the action for
     * transparency.
     */
    moderator_email: string & tags.Format<"email">;

    /**
     * Unique identifier of the member affected by this moderation action if
     * the action targets a user account. References
     * discussion_board_members.id. Null if action targets content
     * (article/comment) rather than user account. Identifies which user was
     * suspended, banned, or had violations recorded.
     */
    affected_member_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Email address of the affected member if applicable. Denormalized for
     * efficient display. Null if moderation action targets content rather
     * than user. Provides human-readable identification of affected user
     * for communication purposes.
     */
    affected_member_email?: (string & tags.Format<"email">) | null | undefined;

    /**
     * Type of moderation action taken. Valid values include:
     * 'remove_article' (permanently delete article), 'remove_comment'
     * (delete comment from discussion), 'suspend_user' (temporary access
     * denial, typically 7 days), 'ban_user' (permanent access denial),
     * 'restore_article' (undo article removal), 'restore_comment' (undo
     * comment removal), 'warning_issued' (formal warning to user),
     * 'flag_content' (mark content for review but don't remove).
     * Standardized values ensure consistent tracking and reporting.
     */
    action_type: string;

    /**
     * Type of entity targeted by this moderation action. Valid values:
     * 'article' (action targets an article), 'comment' (action targets a
     * comment), 'member' (action targets a user account). Used as
     * polymorphic discriminator combined with targetId to identify specific
     * affected entity.
     */
    target_type: string;

    /**
     * Unique identifier of the entity affected by this moderation action.
     * Combined with targetType to identify specific content or user: if
     * targetType is 'article', references discussion_board_articles.id; if
     * 'comment', references discussion_board_comments.id; if 'member',
     * references discussion_board_members.id. Application must validate
     * referential integrity based on targetType.
     */
    target_id: string & tags.Format<"uuid">;

    /**
     * Moderator-provided explanation for why the moderation action was
     * taken. Maximum 500 characters. Documents specific policy violations,
     * problematic behavior, or context for the action. Enables transparent
     * communication with affected users about why their content was removed
     * or account was restricted. Null if no reason provided.
     */
    reason?: string | null | undefined;

    /**
     * Timestamp when this moderation action was executed. Stored in ISO
     * 8601 UTC format. System-generated and immutable. Used for
     * chronological audit trails, action sequencing, and historical
     * analysis of moderation patterns. Enables tracking when enforcement
     * actions occurred.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this moderation log record was last modified. Stored
     * in ISO 8601 UTC format. Updated when log details change. Used for
     * audit trail tracking of any modifications to recorded moderation
     * actions.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Count of violations by type for analytics in the moderation dashboard.
   * Each entry represents one category of policy violation (spam, harassment,
   * inappropriate_content, off_topic, misinformation, copyright_violation,
   * illegal_content) with the number of times that violation type has been
   * recorded.
   *
   * Used to identify which policy violations are most common on the platform,
   * enabling moderators and administrators to focus enforcement efforts on
   * most prevalent issues.
   */
  export type IViolationTypeCount = {
    /**
     * Type of policy violation. Valid values: 'spam' (repetitive unwanted
     * content), 'harassment' (abusive or threatening behavior toward
     * individuals), 'inappropriate_content' (offensive or graphic content),
     * 'off_topic' (content unrelated to economics or politics),
     * 'misinformation' (deliberately false or misleading claims),
     * 'copyright_violation' (unauthorized use of copyrighted material),
     * 'illegal_content' (content promoting illegal activities). Categorizes
     * the nature of policy breach.
     */
    violation_type: string;

    /**
     * Number of times this specific violation type has been recorded across
     * all members. Shows frequency of this violation category on the
     * platform. Higher counts indicate more prevalent violations requiring
     * enforcement focus.
     */
    count: number & tags.Type<"int32">;
  };

  /**
   * Summary of articles and comments pending moderator review or action.
   * Provides counts of flagged content items awaiting moderation decisions
   * and recent items requiring attention. Used in moderation dashboard to
   * show moderators what content needs enforcement decisions.
   *
   * Pending content includes articles and comments with status other than
   * 'published' (such as 'archived' or 'flagged') that may require moderator
   * review, decisions, or enforcement actions. Items are tracked to ensure
   * timely review and prevent indefinite backlogs.
   */
  export type IPendingContentReview = {
    /**
     * Number of articles flagged for moderator review or requiring
     * moderation decision. These are articles that have been reported or
     * identified as potentially violating guidelines. Awaiting moderator
     * action (removal, archival, approval).
     */
    flagged_articles_count: number & tags.Type<"int32">;

    /**
     * Number of comments flagged for moderator review or requiring
     * moderation decision. These are comments reported or identified as
     * policy violations. Awaiting moderator action (removal, approval, or
     * user warning).
     */
    flagged_comments_count: number & tags.Type<"int32">;

    /**
     * Total count of content items pending moderator review or action
     * (flagged articles + flagged comments). Shows total moderation
     * workload requiring decisions.
     */
    total_pending_review: number & tags.Type<"int32">;

    /**
     * Timestamp of the oldest content item still pending review. ISO 8601
     * format in UTC. Indicates how long oldest item has been awaiting
     * moderator decision. Helps identify stale review items. Null if no
     * pending items exist.
     */
    oldest_pending_item_date?:
      | (string & tags.Format<"date-time">)
      | null
      | undefined;
  };

  /**
   * Content aggregation for moderation review. Presents articles, comments,
   * and users that require moderator attention in a single comprehensive
   * view. This structure enables moderators to efficiently identify and
   * address policy violations, manage community health, and enforce community
   * guidelines across all content types.
   */
  export type IContent = {
    /**
     * List of articles that may require moderation review. These are
     * typically published articles that have been flagged for policy
     * violations, spam, inappropriate content, or other community guideline
     * breaches. Members can view article content, titles, authors, creation
     * dates, and associated metadata to assess whether moderation action is
     * needed.
     */
    articles: IDiscussionBoardArticle.IModerationView[];

    /**
     * List of comments under articles that require moderation review.
     * Comments may be flagged for harassment, misinformation, spam,
     * off-topic discussion, or other violations. Moderators can review
     * comment text, authors, timestamps, parent articles, and reply chains
     * to determine if removal or editing is necessary.
     */
    comments: IDiscussionBoardComment.IModerationView[];

    /**
     * List of user accounts that may require administrative action. Users
     * are listed if they have accumulated violations, repeatedly violated
     * community guidelines, or engaged in patterns of problematic behavior.
     * Moderators can review user account status, violation counts,
     * suspension/ban status, and violation history to enforce community
     * standards.
     */
    users: IDiscussionBoardMember.IModerationView[];
  };
}
