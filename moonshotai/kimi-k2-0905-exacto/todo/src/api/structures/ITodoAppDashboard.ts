import { tags } from "typia";

import { ITodoAppCategory } from "./ITodoAppCategory";

export namespace ITodoAppDashboard {
  /**
   * Comprehensive dashboard overview containing task statistics and
   * productivity insights for authenticated users. This overview serves as
   * the primary dashboard interface for users to quickly assess their task
   * management performance and productivity patterns.
   */
  export type IOverview = {
    /** Total number of active tasks across all categories and priorities */
    active_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Total number of completed tasks in user's account */
    completed_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks in pending status */
    pending_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks currently marked as in progress */
    in_progress_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks with High priority level */
    high_priority_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks with Medium priority level */
    medium_priority_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks with Low priority level */
    low_priority_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of tasks that have due dates assigned */
    tasks_with_due_date_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /** Number of tasks with due dates that are past their due date */
    overdue_tasks_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /** Number of tasks due today */
    today_due_tasks_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /** Number of tasks due within the next 7 days */
    week_due_tasks_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /** Percentage completion rate across all time periods */
    task_completion_rate: number & tags.Minimum<0> & tags.Maximum<100>;

    /** Task completion rate for the current week */
    this_week_completion_rate?:
      | (number & tags.Minimum<0> & tags.Maximum<100>)
      | undefined;

    /** Task completion rate for the current month */
    this_month_completion_rate?:
      | (number & tags.Minimum<0> & tags.Maximum<100>)
      | undefined;

    /** Average number of days from task creation to completion */
    average_time_to_completion_days?: (number & tags.Minimum<0>) | undefined;

    /** Task counts organized by category */
    category_counts: ITodoAppDashboard.ICategoryCount[];

    /** Recently completed tasks for trend analysis */
    recent_completions: ITodoAppDashboard.IRecentCompletion[];
  };

  /**
   * Category-level task aggregation dashboard data representing statistical
   * breakdown of task completion patterns across organizational groupings.
   *
   * This dashboard metric DTO provides essential task distribution analytics
   * for users analyzing productivity patterns within specific category
   * context. The data serves as foundation for category-specific completion
   * insights, enabling users to understand how effectively they complete
   * tasks within organizational segments.
   *
   * The completion rate calculation represents weighted analysis combining
   * active task progress tracking with completed task historical completion
   * patterns. This business intelligence metric helps users identify
   * organizational effectiveness and productivity bottlenecks within their
   * structured task organization system.
   *
   * Typically used in dashboard overview contexts where users need quick
   * reference to category-specific performance metrics without requiring
   * detailed task inspection processes.
   */
  export type ICategoryCount = {
    /**
     * Organizational category reference enabling contextual task analysis
     * within user-defined project or context groupings
     */
    category: ITodoAppCategory.ISummary;

    /**
     * Number of non-completed tasks (pending or in-progress status)
     * currently assigned to this organizational category
     */
    active_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of completed tasks historically finished within this category,
     * providing completion pattern historical data
     */
    completed_tasks_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Calculated performance percentage representing ratio of completed
     * tasks to total tasks (completed + active) within category scope for
     * analytical insights
     */
    completion_rate: number & tags.Minimum<0> & tags.Maximum<100>;
  };

  /**
   * Detailed completion event tracking data providing temporal analysis of
   * user productivity patterns through recently completed task lineage
   * chronology.
   *
   * This dashboard metric captures individual task completion instances with
   * comprehensive metadata describing completion circumstances, timing
   * relationships, and performance context that enables users to analyze
   * personal productivity patterns over time periods.
   *
   * The time-to-completion calculation establishes performance benchmarking
   * baseline enabling comparison between user's historical completion
   * patterns and current productivity measurements with hourly precision
   * granularity.
   *
   * Used in dashboard recent activity widgets, completion trend analysis
   * interfaces, and productivity tracking systems that provide users
   * immediate feedback on task management effectiveness patterns over time
   * periods.
   */
  export type IRecentCompletion = {
    /**
     * Unique identifier for this individual completion event record
     * maintaining audit trail for temporal completion pattern analysis
     */
    id: string & tags.Format<"uuid">;

    /**
     * Originating task association providing data lineage reference back to
     * source task and enabling detailed task exploration from completion
     * tracking
     */
    task_id: string & tags.Format<"uuid">;

    /**
     * Original task title providing immediate identification context
     * enabling users to recognize completed work items without additional
     * lookup processes
     */
    title: string;

    /**
     * Optional category context providing organizational position
     * information enabling category-based completion pattern analysis and
     * grouping insights
     */
    category: ITodoAppCategory.ISummary | null;

    /**
     * Task importance level during completion category providing completion
     * pattern weighting for productivity analysis and insights
     */
    priority: "Low" | "Medium" | "High";

    /**
     * Exact completion timestamp enabling precise temporal positioning of
     * completion events within user's task management workflow chronology
     */
    completed_at: string & tags.Format<"date-time">;

    /**
     * Calculated completion duration measured in whole hours from original
     * task creation timestamp to finishing completion action, providing
     * productivity efficiency metrics with hourly granularity measurement
     * precision
     */
    time_to_completion_hours: number & tags.Minimum<0>;
  };
}
