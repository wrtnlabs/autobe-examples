import { tags } from "typia";

export namespace IDiscussionBoardReportOfAttachment {
  /**
   * Inverted composition DTO centered on a single attachment-targeting
   * report.
   *
   * This type is optimized for moderation views that start from a report
   * identifier and need, in one response, both the link between the report
   * and the attachment and a compact view of the underlying report and
   * attachment metadata.
   *
   * It composes the `discussion_board_report_of_attachments` link row
   * together with a summary of the base report from
   * `discussion_board_reports` and the attachment metadata from
   * `discussion_board_attachments`. To avoid circular references and heavy
   * payloads, it excludes any collections or nested lists; consumers retrieve
   * related articles or further attachment usage via separate endpoints if
   * needed.
   */
  export type IInvert = {
    /**
     * Primary key of the attachment-report link.
     *
     * This is the unique identifier from
     * `discussion_board_report_of_attachments.id`, representing the
     * specific association between a single report record and a single
     * attachment. Multiple link rows may point to different reports for the
     * same attachment, but each association has its own id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the report that targets an attachment.
     *
     * Backed by
     * `discussion_board_report_of_attachments.discussion_board_report_id`,
     * this field joins the link entity to the central
     * `discussion_board_reports` row. It is usually identical to the
     * `reportId` path parameter used when calling the detail endpoint that
     * returns this DTO.
     */
    discussion_board_report_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the attachment that has been reported.
     *
     * This value comes from
     * `discussion_board_report_of_attachments.discussion_board_attachment_id`
     * and points to the primary key of the file in
     * `discussion_board_attachments`. It allows clients to fetch additional
     * attachment or article details when necessary.
     */
    discussion_board_attachment_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this report-to-attachment association was created.
     *
     * Mapped from `discussion_board_report_of_attachments.created_at`, this
     * time is recorded when the system first linked the report to the
     * attachment. It is useful for auditing the sequence of moderation
     * events and for debugging linkage timing.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Compact view of the base report associated with this attachment link.
     *
     * This object summarizes key fields from the underlying
     * `discussion_board_reports` row, such as reason code, workflow status,
     * action, and timestamps. It intentionally omits any collections or
     * reverse relations to avoid circular structures while still giving
     * moderators the information needed to understand why the attachment
     * was reported.
     */
    report: IDiscussionBoardReportOfAttachment.IReportSummary;

    /**
     * Compact metadata for the attachment that was reported.
     *
     * This object summarizes key fields from
     * `discussion_board_attachments`, including file name, URI, content
     * type, size, ordering within the parent article, and moderation
     * status. It is designed to give moderators enough context to decide
     * whether to keep, hide, or delete the file without loading unrelated
     * article or board-level aggregates.
     */
    attachment: IDiscussionBoardReportOfAttachment.IAttachmentSummary;
  };

  /**
   * Summary view of a discussion board report for use inside
   * attachment-targeting report DTOs.
   *
   * This type captures the most important moderation fields from
   * `discussion_board_reports` when the report appears as a nested object
   * within `IDiscussionBoardReportOfAttachment.IInvert`. It is intentionally
   * lightweight and omits any child collections or polymorphic link details.
   *
   * Consumers use this summary to understand who reported the attachment, why
   * it was reported, and what the current moderation status and action are,
   * without needing to issue a separate report-detail query in simple
   * decision flows.
   */
  export type IReportSummary = {
    /**
     * Primary key of the report.
     *
     * Copied from `discussion_board_reports.id`, this value uniquely
     * identifies the report row associated with the reported attachment.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Discriminator describing the type of content targeted by this report.
     *
     * Taken from `discussion_board_reports.target_type`. For this invert
     * usage, the logical expectation is that the value is `attachment`, but
     * it is exposed so clients can verify the target type and guard against
     * misuse.
     */
    target_type: string;

    /**
     * Discriminator describing which actor type submitted the report.
     *
     * Backed by `discussion_board_reports.reporter_type`, such as
     * `memberuser` or `adminuser`. This allows moderation tools to
     * understand the origin of the report when reviewing it in
     * attachment-specific contexts.
     */
    reporter_type: string;

    /**
     * Machine-friendly code representing the primary reason category for
     * this report.
     *
     * Mapped from `discussion_board_reports.reason_code`. Typical values
     * include `hate_abuse`, `harassment`, `spam`, `off_topic`,
     * `dangerous_misleading`, and `other`. The exact allowed set is
     * governed by business rules.
     */
    reason_code: string;

    /**
     * Optional free-text explanation provided by the reporter.
     *
     * This corresponds to the nullable
     * `discussion_board_reports.description` column. It contains additional
     * description that elaborates on the selected `reason_code`, or is null
     * when no extended explanation was provided.
     */
    description?: string | null | undefined;

    /**
     * Current workflow status of the report.
     *
     * Backed by `discussion_board_reports.status`, representing states such
     * as `submitted`, `in_review`, or `resolved`. Moderation tools rely on
     * this field to drive queues and identify which reports still need
     * action.
     */
    status: string;

    /**
     * Administrative decision applied in response to this report.
     *
     * Mapped from `discussion_board_reports.action`. Example values include
     * `none`, `keep`, `hide_content`, `delete_content`, and
     * `restrict_user`. Together with `status`, this field documents the
     * outcome of moderation over time.
     */
    action: string;

    /**
     * Timestamp when the report was created.
     *
     * This is taken from `discussion_board_reports.created_at` and
     * indicates when the report was originally submitted by the reporter.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the report was last updated.
     *
     * Taken from `discussion_board_reports.updated_at`, this field updates
     * whenever moderators change the report's status, action, or other
     * mutable fields, and is useful for tracking the freshness of
     * moderation decisions.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Summary view of a discussion board attachment for use inside
   * attachment-targeting report DTOs.
   *
   * This type reflects key metadata from the `discussion_board_attachments`
   * table needed for moderation, including file URI, name, content type,
   * size, ordering within the article, moderation status, and relevant
   * timestamps. It intentionally omits heavy article or board-level
   * relational data to keep the nested structure small and focused.
   *
   * Moderators use this summary to quickly understand what file was reported
   * and how it is currently treated by the system, while any deeper article
   * or author context is loaded via separate dedicated endpoints if
   * required.
   */
  export type IAttachmentSummary = {
    /**
     * Primary key of the attachment record.
     *
     * This value comes from `discussion_board_attachments.id` and uniquely
     * identifies the stored attachment within the board.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the parent article to which this attachment belongs.
     *
     * This field is mapped from
     * `discussion_board_attachments.discussion_board_article_id`. It allows
     * clients or internal tools to navigate to the article that owns this
     * attachment when additional context is needed.
     */
    discussion_board_article_id: string & tags.Format<"uuid">;

    /**
     * URI location of the stored file object.
     *
     * Backed by `discussion_board_attachments.file_uri`, this value points
     * to the storage location used by the application to retrieve or stream
     * the attachment. It is a URL-style string managed by the file storage
     * subsystem.
     */
    file_uri: string & tags.Format<"uri">;

    /**
     * User-visible file name of the attachment.
     *
     * Taken from `discussion_board_attachments.file_name`, this string
     * typically represents the original client file name adjusted for
     * safety and consistency. It is displayed in UIs when listing or
     * previewing attachments.
     */
    file_name: string;

    /**
     * MIME-like content type for the attachment.
     *
     * This field maps to `discussion_board_attachments.content_type` and
     * indicates how the file should be interpreted or previewed, such as
     * `image/jpeg` or `application/pdf`.
     */
    content_type: string;

    /**
     * Size of the attachment file in bytes.
     *
     * Backed by `discussion_board_attachments.file_size`, this integer is
     * used to enforce per-file and per-article size limits and for
     * presenting approximate size to users in moderation tools or article
     * views.
     */
    file_size: number & tags.Type<"int32">;

    /**
     * Display order of this attachment within its parent article.
     *
     * Mapped from `discussion_board_attachments.order_in_article`, this
     * integer determines the ordering of attachments when rendered. Lower
     * values appear earlier in UI lists. The pair
     * `(discussion_board_article_id, order_in_article)` is unique at the
     * database level.
     */
    order_in_article: number & tags.Type<"int32">;

    /**
     * Moderation and lifecycle status of the attachment.
     *
     * This string reflects `discussion_board_attachments.status` and
     * typically carries values such as `active`, `hidden`, or `deleted`,
     * aligned with the board's overall content visibility rules. Moderation
     * operations change this field when hiding or removing attachments.
     */
    status: string;

    /**
     * Timestamp when the attachment record was created.
     *
     * Taken from `discussion_board_attachments.created_at`, this marks when
     * the file was first associated with its article.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the attachment record was last updated.
     *
     * Mapped from `discussion_board_attachments.updated_at`, this value
     * changes when metadata or status fields are modified.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp of the attachment.
     *
     * This field corresponds to the nullable
     * `discussion_board_attachments.deleted_at` column. When null, the
     * attachment is not soft-deleted and may be visible depending on its
     * `status`. When set, it indicates the time at which the attachment was
     * logically deleted for business purposes even if its metadata remains
     * stored for audit or recovery.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
